import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectEntityManager } from '@nestjs/typeorm'
import { EntityManager } from 'typeorm'
import { nextSnowflakeId } from '../common/snowflake-id'
import { AiSessionEntity } from './entities/ai-session.entity'
import { AiMessageEntity } from './entities/ai-message.entity'
import type { ChatSource } from './chat.types'
import { CreateSessionDto, QuerySessionDto, UpdateSessionDto } from './dto/session.dto'

const DEFAULT_TITLE = '新对话'

@Injectable()
export class ChatSessionService {
  constructor(
    @InjectEntityManager()
    private readonly em: EntityManager,
  ) {}

  // 查询会话列表,分页显示
  async pageMine(userId: string, query: QuerySessionDto) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const [items, total] = await this.em.findAndCount(AiSessionEntity, {
      where: { userId },
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
    return { items, total, page, pageSize }
  }

  // 创建会话, 生成 id 和 title 即可
  async create(userId: string, dto: CreateSessionDto) {
    const title = dto.title?.trim() || DEFAULT_TITLE
    const session = this.em.create(AiSessionEntity, {
      id: nextSnowflakeId(),
      userId,
      title: title.slice(0, 80),
    })
    return this.em.save(session)
  }

  async rename(userId: string, id: string, dto: UpdateSessionDto) {
    const session = await this.getOwned(userId, id)
    session.title = dto.title.trim().slice(0, 80)
    return this.em.save(session)
  }

  async remove(userId: string, id: string) {
    // 为什么要传 userId, 会话的id 即可删除啊?
    await this.getOwned(userId, id)
    // 删除会话的对话记录
    await this.em.delete(AiMessageEntity, { sessionId: id })
    await this.em.delete(AiSessionEntity, { id })
    return { message: '已删除' }
  }

  async listMessages(userId: string, sessionId: string) {
    await this.getOwned(userId, sessionId)
    return this.em.find(AiMessageEntity, {
      where: { sessionId },
      order: { createdAt: 'ASC', id: 'ASC' },
    })
  }

  /**
   * 追加对话记录, 将用户的问题和助手的回答落库, 并更新会话的更新时间
   * 问答落库：无 sessionId 则新建；标题在仍为默认名时用首问覆盖。
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @param question 问题
   * @param answer 答案
   * @param sources 来源
   * @returns 会话
   */
  async appendTurn(
    userId: string,
    sessionId: string | undefined,
    question: string,
    answer: string,
    sources: ChatSource[],
  ) {
    // 如果 sessionId 存在, 则获取会话, 否则创建新会话
    const session = sessionId
      ? await this.getOwned(userId, sessionId)
      : await this.create(userId, { title: titleFromQuestion(question) })

    // 如果会话的标题为默认标题, 则更新为问题的前30个字符
    if (session.title === DEFAULT_TITLE) {
      session.title = titleFromQuestion(question)
    }

    // 更新会话的更新时间
    session.updatedAt = new Date()
    await this.em.save(session)

    // 创建用户消息
    const userMsg = this.em.create(AiMessageEntity, {
      id: nextSnowflakeId(),
      sessionId: session.id,
      role: 'user',
      content: question,
    })

    // 创建助手消息
    const assistantMsg = this.em.create(AiMessageEntity, {
      id: nextSnowflakeId(),
      sessionId: session.id,
      role: 'assistant',
      content: answer,
      sources: sources.length ? sources : null,
    })

    // 保存用户消息和助手消息
    await this.em.save([userMsg, assistantMsg])
    return session
  }

  private async getOwned(userId: string, id: string) {
    const session = await this.em.findOne(AiSessionEntity, {
      where: { id, userId },
    })
    if (!session) {
      throw new NotFoundException('会话不存在')
    }
    return session
  }
}

function titleFromQuestion(question: string) {
  const text = question.replace(/\s+/g, ' ').trim()
  if (!text) return DEFAULT_TITLE
  return text.length > 30 ? `${text.slice(0, 30)}…` : text
}
