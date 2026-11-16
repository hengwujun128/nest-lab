/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-11-02 17:02:32
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-11-10 14:19:31
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/ai/chat-short-memory.service.ts
 */
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  AIMessage,
  HumanMessage,
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
  type BaseMessage,
} from '@langchain/core/messages'

import { RedisService } from '../redis/redis.service'
import { isWorkingMessage } from './chat-memory.util'

/**
 * 对话短期记忆：Redis 热窗口。
 * miss / 故障时由调用方从 Postgres 回填再 save。
 * 只存 human/ai 原文，不含检索资料、思考、Mem0 系统消息。
 */
@Injectable()
export class ChatShortMemoryService {
  private readonly logger = new Logger(ChatShortMemoryService.name)
  private readonly ttlSeconds: number
  private readonly maxMessages: number
  private readonly keyPrefix: string

  constructor(
    config: ConfigService,
    private readonly redis: RedisService,
  ) {
    // 短期记忆的过期时间，默认 24 小时
    this.ttlSeconds = Number(config.get('CHAT_SHORT_MEMORY_TTL_SECONDS', 86400))
    // 短期记忆的最大消息数，默认 20 条
    this.maxMessages = Number(config.get('CHAT_SHORT_MEMORY_MAX_MESSAGES', 20))
    // 短期记忆的键前缀，默认 'kh:chat'
    this.keyPrefix = config.get('CHAT_SHORT_MEMORY_KEY_PREFIX', 'kh:chat')
  }

  get windowSize() {
    return this.maxMessages
  }

  /** 命中返回消息；key 不存在或 Redis 故障返回 null */
  async tryLoad(userId: string, sessionId: string): Promise<BaseMessage[] | null> {
    try {
      const raw = await this.redis.get(this.key(userId, sessionId))
      if (!raw) return null
      // 把 JSON 字符串解析为对象数组
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) return null
      // 把 JSON 对象数组映射为 ChatMessage 数组，并过滤出AI message 和 Human message
      return mapStoredMessagesToChatMessages(parsed).filter(isWorkingMessage)
    } catch (error) {
      this.logger.warn(`短期记忆 Redis 读取失败，改走数据库：${error instanceof Error ? error.message : error}`)
      return null
    }
  }

  /** 写入 Redis */
  async save(userId: string, sessionId: string, messages: BaseMessage[]): Promise<void> {
    /** 只保留 human/ai message，不含检索资料、思考、Mem0 系统消息, 截取最后 20 条 */
    const working = messages.filter(isWorkingMessage).slice(-this.maxMessages)
    try {
      // 把 ChatMessage 数组映射为 JSON 对象数组
      const payload = JSON.stringify(mapChatMessagesToStoredMessages(working))
      await this.redis.set(this.key(userId, sessionId), payload, this.ttlSeconds)
    } catch (error) {
      this.logger.warn(`短期记忆 Redis 写入失败：${error instanceof Error ? error.message : error}`)
    }
  }

  async appendTurn(
    userId: string,
    sessionId: string,
    history: BaseMessage[],
    question: string,
    answer: string,
  ): Promise<void> {
    await this.save(userId, sessionId, [...history, new HumanMessage(question), new AIMessage(answer)])
  }

  // 清理短期记忆
  async clear(userId: string, sessionId: string): Promise<void> {
    try {
      await this.redis.del(this.key(userId, sessionId))
    } catch (error) {
      this.logger.warn(`短期记忆 Redis 删除失败：${error instanceof Error ? error.message : error}`)
    }
  }

  // 短期记忆的键，默认 'kh:chat:userId:sessionId:messages'
  private key(userId: string, sessionId: string) {
    return `${this.keyPrefix}:${userId}:${sessionId}:messages`
  }
}
