import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import amqp from 'amqp-connection-manager'
import type { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager'
import type { ConfirmChannel, ConsumeMessage } from 'amqplib'
import { RAG_REINDEX_EXCHANGE, RAG_REINDEX_QUEUE, RAG_RK_BY_IDS } from './mq.constants'

export type MessageHandler = (msg: ConsumeMessage) => Promise<void> | void

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqService.name)
  private connection: AmqpConnectionManager | null = null
  private channel: ChannelWrapper | null = null
  private readonly enabled: boolean
  // 存储队列和消费者处理函数的映射关系
  private readonly handlers = new Map<string, MessageHandler>()

  constructor(private readonly config: ConfigService) {
    this.enabled = this.config.get<string>('RABBITMQ_ENABLED', 'true') !== 'false'
  }

  get isEnabled() {
    return this.enabled
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('RabbitMQ 已禁用（RABBITMQ_ENABLED=false）')
      return
    }

    const url = this.config.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')
    const safeUrl = this.redactAmqpUrl(url)
    const timeoutMs = Number(this.config.get<string>('RABBITMQ_CONNECT_TIMEOUT_MS', '15000'))

    this.logger.log(`正在连接 RabbitMQ：${safeUrl}（超时 ${timeoutMs}ms）`)

    // 连接 RabbitMQ 服务
    this.connection = amqp.connect([url])

    // 连接成功
    this.connection.on('connect', (arg) => {
      const connectedUrl =
        typeof arg === 'object' && arg && 'url' in arg ? String((arg as { url?: string }).url ?? url) : url
      this.logger.log(`RabbitMQ 已连接：${this.redactAmqpUrl(connectedUrl)}`)
    })

    // 连接断开
    this.connection.on('disconnect', (err) => this.logger.warn(`RabbitMQ 断开：${this.errorMessage(err?.err ?? err)}`))

    // 连接失败
    this.connection.on('connectFailed', (err) =>
      this.logger.error(`RabbitMQ 连接失败：${this.errorMessage(err?.err ?? err)}（url=${safeUrl}）`),
    )

    // 创建 channel
    this.channel = this.connection.createChannel({
      json: true,
      // NOTE:setup 在每次重连后都会重跑
      // NOTE:把「声明拓扑 + 绑定消费者」放进去是正确姿势——重连后队列/消费者不会丢。✅ 这是这个库的精髓，用对了。
      setup: async (ch: ConfirmChannel) => {
        this.logger.log('RabbitMQ channel setup：声明拓扑并绑定消费者')
        // 拓扑（topology）= RabbitMQ 里的交换机、队列、绑定关系这套结构
        await this.assertTopology(ch)
        // 绑定消费者
        await this.bindConsumers(ch)
      },
    })

    // 连接超时
    try {
      // NOTE: 谁先结束（resolve 或 reject），整体就用谁的结果
      // ① waitForConnect() 在超时前完成,race resolve → 走「channel 就绪」
      // ② setTimeout 在超时后完成,race reject → 进 catch，清理连接并抛错
      await Promise.race([
        this.channel.waitForConnect(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                `RabbitMQ 连接超时（${timeoutMs}ms）：${safeUrl}。请检查服务是否启动、5672 是否被其他容器占用、账号密码是否正确`,
              ),
            )
          }, timeoutMs)
        }),
      ])
      this.logger.log('RabbitMQ channel 就绪')
    } catch (error) {
      // 初始化失败
      const message = this.errorMessage(error)
      this.logger.error(`RabbitMQ 初始化失败：${message}`)
      await this.connection.close().catch(() => undefined)
      this.connection = null
      this.channel = null
      throw error
    }
  }

  /** 日志里隐藏 AMQP 密码 */
  private redactAmqpUrl(url: string) {
    return url.replace(/\/\/([^:/@]+):([^@]+)@/, '//$1:***@')
  }

  private errorMessage(error: unknown) {
    if (error instanceof Error) return error.message
    if (
      typeof error === 'object' &&
      error &&
      'message' in error &&
      typeof (error as { message: unknown }).message === 'string'
    ) {
      return (error as { message: string }).message
    }
    return String(error ?? 'unknown')
  }

  async onModuleDestroy() {
    await this.channel?.close()
    await this.connection?.close()
  }

  /** 注册队列消费者（在模块 init 前/后均可；连接就绪后生效） */
  registerHandler(queue: string, handler: MessageHandler) {
    this.handlers.set(queue, handler)
  }

  // 发送消息到 RabbitMQ
  async publish(exchange: string, routingKey: string, payload: unknown): Promise<boolean> {
    if (!this.enabled || !this.channel) {
      this.logger.warn(`跳过发消息（MQ 不可用）：exchange=${exchange}, rk=${routingKey}`)
      return false
    }

    try {
      // await 的意义不是「等消息发出去」，而是等 broker 真正确认接住了这条消息
      // 等到 broker confirm 才继续执行,
      await this.channel.publish(exchange, routingKey, payload, {
        contentType: 'application/json',
        persistent: true,
      })
      // 给调用方一个明确的成败信号，而不是靠抛异常：
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`发消息失败：exchange=${exchange}, rk=${routingKey}, error=${message}`)
      return false
    }
  }

  // NOTE: 声明拓扑
  private async assertTopology(ch: ConfirmChannel) {
    // 声明交换机: rag.reindex.exchange （topic 类型） 持久化
    await ch.assertExchange(RAG_REINDEX_EXCHANGE, 'topic', { durable: true })
    // 声明队列: kh.rag.reindex.queue 持久化
    await ch.assertQueue(RAG_REINDEX_QUEUE, { durable: true })
    // NOTE: 绑定队列到交换机:  把队列按路由键绑到交换机上，消息才能从交换机流进队列
    await ch.bindQueue(RAG_REINDEX_QUEUE, RAG_REINDEX_EXCHANGE, RAG_RK_BY_IDS)

    this.logger.log('RabbitMQ 拓扑已声明（RAG）')
  }

  // NOTE: 绑定消费者
  // 把之前 registerHandler 登记在 Map 里的 handler，真正挂到队列上开始消费：
  private async bindConsumers(ch: ConfirmChannel) {
    // 遍历 handlers 里的每个队列和 handler 函数，挨个挂上去
    for (const [queue, handler] of this.handlers.entries()) {
      // 每个队列一个独立的 consumer，互不干扰
      await ch.consume(queue, (msg) => {
        if (!msg) return
        void (async () => {
          try {
            await handler(msg)
            ch.ack(msg)
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            this.logger.error(`消费失败 queue=${queue}: ${message}`)
            ch.nack(msg, false, false)
          }
        })()
      })
      this.logger.log(`已注册消费者：${queue}`)
    }
  }
}
