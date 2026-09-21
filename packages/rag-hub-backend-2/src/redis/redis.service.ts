/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-14 11:35:28
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-21 17:02:00
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/redis/redis.service.ts
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Redis, type RedisOptions } from 'ioredis'

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private readonly client: Redis

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('REDIS_HOST', 'localhost')
    const port = this.config.get<number>('REDIS_PORT', 6379)
    const options: RedisOptions = {
      host,
      port,
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      db: this.config.get<number>('REDIS_DB', 0),
      maxRetriesPerRequest: 3,
    }
    this.client = new Redis(options)
    // 必须监听 error，否则连接失败时 ioredis 会刷 Unhandled error event
    this.client.on('error', (err) => {
      this.logger.warn(`Redis 连接异常 ${host}:${port}：${err.message}`)
    })
    this.client.on('connect', () => {
      this.logger.log(`Redis 已连接 ${host}:${port}`)
    })
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined) {
      await this.client.set(key, value, 'EX', ttlSeconds)
      return
    }
    await this.client.set(key, value)
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key)
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit()
  }
}
