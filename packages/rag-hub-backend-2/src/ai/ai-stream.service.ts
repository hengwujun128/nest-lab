import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { createUIMessageStream, pipeUIMessageStreamToResponse, type UIMessage } from 'ai'
import { toUIMessageStream } from '@ai-sdk/langchain'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage } from '@langchain/core/messages'
import type { BaseMessage } from '@langchain/core/messages'
import { createAgent, modelCallLimitMiddleware, summarizationMiddleware, tool } from 'langchain'
import { z } from 'zod'
import type { Response } from 'express'
import { HybridRetrievalService } from './hybrid-retrieval.service'
import { ChatSessionService } from './chat-session.service'
import { WebSearchService } from './web-search.service'
import type { AuthUser } from '../auth/auth-user.interface'
import type { ChatSource } from './chat.types'
import type { ChatStreamDto } from './dto/chat-stream.dto'
import type { ChunkHit } from '../pipeline/types/pipeline.types'
import { ChatQueryRewriteService } from './chat-query-rewrite.service'
import { ChatShortMemoryService } from './chat-short-memory.service'
import { ChatLongMemoryService } from './chat-long-memory.service'

import { dbRowsToMessages } from './chat-memory.util'

const EXCERPT_LEN = 200

const SYSTEM =
  '你是企业知识库助手。优先根据「检索到的资料」回答。' +
  '资料不足、需要时效性或外部公开信息时，调用 web_search。' +
  '依据资料的陈述句末标 [n]，与资料编号一致。' +
  '联网结果用标题+链接说明，不要编造。资料不够就明确说不知道。'

type KhUIMessage = UIMessage<
  unknown,
  {
    status: { stage: string; text: string }
    think: { text: string }
    sources: ChatSource[]
    retrieve: {
      query: string
      items: Array<{
        index: number
        documentId: string
        documentTitle: string
        heading: string | null
      }>
    }
    session: { sessionId: string }
  }
>

@Injectable()
export class AiStreamService {
  private readonly logger = new Logger(AiStreamService.name)
  private readonly agent?: ReturnType<typeof createAgent>

  constructor(
    config: ConfigService,
    private readonly retrieval: HybridRetrievalService,
    private readonly sessions: ChatSessionService,
    private readonly webSearch: WebSearchService,
    private readonly shortMemory: ChatShortMemoryService,
    private readonly longMemory: ChatLongMemoryService,
    private readonly queryRewrite: ChatQueryRewriteService,
  ) {
    const apiKey =
      config.get<string>('OPENAI_API_KEY') ||
      config.get<string>('LLM_API_KEY') ||
      config.get<string>('DASHSCOPE_API_KEY') ||
      ''
    const baseURL =
      config.get<string>('OPENAI_BASE_URL') ||
      config.get<string>('LLM_BASE_URL') ||
      'https://dashscope.aliyuncs.com/compatible-mode/v1'

    const modelName = config.get<string>('MODEL_NAME') || config.get<string>('LLM_MODEL') || 'qwen-plus'
    const enableThinking = config.get<string>('LLM_ENABLE_THINKING') !== 'false'

    if (!apiKey) return

    const llm = new ChatOpenAI({
      apiKey,
      model: modelName,
      temperature: 0.2,
      timeout: Number(config.get('AI_CHAT_TIMEOUT_MS', 60000)),
      maxRetries: 0,
      useResponsesApi: false,
      streamUsage: false,
      configuration: { baseURL },
      modelKwargs: enableThinking ? { enable_thinking: true } : undefined,
    })

    // 摘要/分类不要开思考，结构化输出更容易稳
    const compactLlm = new ChatOpenAI({
      apiKey,
      model: modelName,
      temperature: 0,
      timeout: Number(config.get('AI_CHAT_TIMEOUT_MS', 60000)),
      maxRetries: 0,
      useResponsesApi: false,
      configuration: { baseURL },
    })

    const search = this.webSearch
    this.agent = createAgent({
      model: llm,
      tools: [
        tool(async (input: { query: string; count?: number }) => search.search(input.query, input.count ?? 5), {
          name: 'web_search',
          description:
            '联网搜索（Bocha）。知识库不足、需要最新公开信息或外部资料时再调用。不要用它替代知识库已有内容。',
          schema: z.object({
            query: z.string().min(1).describe('搜索关键词'),
            count: z.number().int().min(1).max(10).optional().describe('条数，默认 5'),
          }),
        }),
      ],
      systemPrompt: SYSTEM,
      middleware: [
        // 开启摘要/分类
        summarizationMiddleware({
          model: compactLlm,
          trigger: { messages: 12 },
          keep: { messages: 6 },
          summaryPrompt:
            '用中文简洁总结对话：话题、已确认结论、待办。不要写入知识库条文。\n\n待摘要的对话：\n{messages}\n\n摘要：',
        }),

        // 单次 invoke 最多调 4 次模型，避免 web_search 循环打爆；超限正常结束而非抛错
        modelCallLimitMiddleware({ runLimit: 4, exitBehavior: 'end' }),
      ],
    })
  }

  async streamChat(dto: ChatStreamDto, user: AuthUser, res: Response) {
    // 只取最后一条用户问题
    const question = lastUserText(dto.messages)
    const topK = dto.topK ?? 5
    let persistSessionId = dto.sessionId
    let persistSources: ChatSource[] = []
    let persistHistory: BaseMessage[] = []

    // SDK 只提供 UI Message 协议；会话、RAG、data-* 和 Agent 流要在 execute 里自己编排
    // NOTE: 定义要输出的事件类型:
    const stream = createUIMessageStream<KhUIMessage>({
      execute: async ({ writer }) => {
        // 开始流式响应
        writer.write({ type: 'start' })

        // 如果用户问题为空，则提示请输入问题，并结束流式响应
        if (!question) {
          writer.write({ type: 'text-start', id: 'empty' })
          writer.write({
            type: 'text-delta',
            id: 'empty',
            delta: '请输入问题。',
          })
          writer.write({ type: 'text-end', id: 'empty' })
          writer.write({ type: 'finish' })
          return
        }

        // 创建|更新 session 会话 (创建 session 或更新 session 标题)
        const session = dto.sessionId
          ? await this.sessions.touchTitle(user.userId, dto.sessionId, question)
          : await this.sessions.create(user.userId, {
              title: titleFromQuestion(question),
            })

        // 获取 session会话 ID
        persistSessionId = session.id
        writer.write({
          type: 'data-session',
          data: { sessionId: session.id },
        })

        // 根据 session会话 ID 加载短期记忆，用于问题重写和知识库检索
        const history = await this.loadWorkingHistory(user.userId, session.id)
        persistHistory = history

        if (history.length) {
          writer.write({
            type: 'data-status',
            data: { stage: 'rewrite', text: '正在理解问题…' },
          })
        }

        // 根据短期记忆进行问题重写,并返回重写后的问题和是否需要知识库检索
        const plan = await this.queryRewrite.rewrite(question, history)

        // 是否需要知识库检索
        if (plan.needRetrieve) {
          writer.write({
            type: 'data-status',
            data: { stage: 'retrieve', text: '正在检索知识库…' },
          })
        }

        // 并行执行获取检索结果和长期记忆: 知识库检索 + 长期记忆
        const [hits, memHits] = await Promise.all([
          plan.needRetrieve
            ? this.retrieval.retrieve(plan.query, topK, user).catch((error) => {
                const detail = error instanceof Error ? error.message : String(error)
                this.logger.warn(`RAG 检索失败：${detail}`)
                return [] as ChunkHit[]
              })
            : Promise.resolve([] as ChunkHit[]),
          // 长期记忆
          this.longMemory.search(user.userId, session.id, plan.query),
        ])

        // 先将RAG检索结果(数组)转换为源数据, 如: 索引、文档ID、文档标题、段落,打分等
        const sources = this.toSources(hits)

        // 持久化源数据
        persistSources = sources

        // 写入RAG检索结果(UI消息流)
        writer.write({
          type: 'data-retrieve',
          data: {
            query: question,
            items: sources.map((src) => ({
              index: src.index,
              documentId: src.documentId,
              documentTitle: src.documentTitle,
              heading: src.heading,
            })),
          },
        })

        // 写入数据源结果(UI消息流)data-sources
        writer.write({ type: 'data-sources', data: sources })
        // 写 source-document
        for (const src of sources) {
          writer.write({
            type: 'source-document',
            sourceId: src.documentId,
            mediaType: 'text/markdown',
            title: `[${src.index}] ${src.documentTitle}`,
          })
        }
        // 写 error
        if (!this.agent) {
          writer.write({
            type: 'error',
            errorText: '未配置 LLM Key，无法生成回答',
          })
          writer.write({ type: 'finish' })
          return
        }

        /* -------------------------------------------------------------------------- */
        /*                                  开始拼接上下文部分                           */
        /* -------------------------------------------------------------------------- */
        // 1. 先拼接 prompt(主要是rag检索结果和用户问题的拼接)
        const prompt = hits.length
          ? `检索到的资料：\n${this.buildContext(hits)}\n\n用户问题：${question}`
          : plan.needRetrieve
            ? `知识库没有召回到相关内容。\n\n用户问题：${question}`
            : `用户问题：${question}`

        // 2. 根据长期记忆构建系统消息(SystemMessage)
        const memoryMsg = this.longMemory.buildSystemMessage(memHits)

        // 3: prompt作为HumanMessage和常记忆(SystemMessage)都 拼接 成 messages 传递给 Agent
        const langchainStream = await this.agent.stream(
          {
            messages: [...(memoryMsg ? [memoryMsg] : []), ...history, new HumanMessage(prompt)],
          },
          // messages：模型 token/思考；tools：web_search 调用，给适配包转成 tool-* 事件
          { streamMode: ['messages', 'tools'] },
        )

        /* -------------------------------------------------------------------------- */
        /*                             将Agent的流式响应合并到UI消息流                    */
        /* -------------------------------------------------------------------------- */
        writer.merge(
          toUIMessageStream(mapReasoningStream(langchainStream) as never, {
            // 外层 execute 已写 start，流结束由 createUIMessageStream 收口，避免重复
            sendStart: false,
            sendFinish: false,
            onError: (error) => {
              this.logger.warn(`LangChain 流失败：${error.message}`)
            },
          }) as never,
        )
      },
      onFinish: async ({ responseMessage }) => {
        const parts = responseMessage?.parts ?? []
        const answer = parts
          .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map((p) => p.text)
          .join('')
          .trim()
        const used = new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))
        const sources = used.size ? persistSources.filter((s) => used.has(s.index)) : []
        if (!question || !persistSessionId) return

        const finalAnswer = answer || '未能生成回答。'

        try {
          // 写入会话
          await this.sessions.appendTurn(user.userId, persistSessionId, question, finalAnswer, sources)

          // 写入短期记忆
          await this.shortMemory.appendTurn(user.userId, persistSessionId, persistHistory, question, finalAnswer)
        } catch (error) {
          this.logger.warn(`流式对话落库失败：${error instanceof Error ? error.message : error}`)
        }
        // 写入长期记忆
        await this.longMemory.rememberTurn(user.userId, persistSessionId, question, finalAnswer)
      },
      onError: (error) => (error instanceof Error ? error.message : String(error)),
    })

    await pipeUIMessageStreamToResponse({ response: res, stream })
  }

  private async loadWorkingHistory(userId: string, sessionId: string) {
    const cached = await this.shortMemory.tryLoad(userId, sessionId)
    if (cached) return cached
    const rows = await this.sessions.listRecentMessages(userId, sessionId, this.shortMemory.windowSize)
    const history = dbRowsToMessages(rows)
    if (history.length) {
      await this.shortMemory.save(userId, sessionId, history)
      this.logger.log(`短期记忆从库回填：sessionId=${sessionId}, n=${history.length}`)
    }
    return history
  }

  private toSources(hits: ChunkHit[]): ChatSource[] {
    return hits.map((hit, i) => ({
      index: i + 1,
      documentId: hit.documentId,
      documentTitle: hit.documentTitle,
      heading: hit.heading,
      excerpt: excerpt(hit.content),
      score: hit.score,
    }))
  }

  private buildContext(hits: ChunkHit[]): string {
    return hits
      .map((src, i) => {
        const heading = src.heading ? ` / ${src.heading}` : ''
        const snippet = src.content.length > 800 ? `${src.content.slice(0, 800)}...` : src.content
        return `[${i + 1}] ${src.documentTitle}${heading}\n${snippet}`
      })
      .join('\n\n')
  }
}

/**
 * 百炼兼容口把思考放在 reasoning_content；适配包只认
 * additional_kwargs.reasoning.summary，这里转一下。
 */
async function* mapReasoningStream(stream: AsyncIterable<unknown>): AsyncIterable<unknown> {
  for await (const event of stream) {
    attachDashScopeReasoning(event)
    yield event
  }
}

/** 递归找 additional_kwargs.reasoning_content 并改写成适配包要的 reasoning.summary；seen 防循环引用 */
function attachDashScopeReasoning(value: unknown, seen = new Set<object>()): void {
  if (value == null || typeof value !== 'object' || seen.has(value)) return
  seen.add(value)
  if (Array.isArray(value)) {
    for (const item of value) attachDashScopeReasoning(item, seen)
    return
  }
  const obj = value as Record<string, unknown>
  const kwargs = obj.additional_kwargs as Record<string, unknown> | undefined
  if (typeof kwargs?.reasoning_content === 'string' && kwargs.reasoning_content) {
    kwargs.reasoning = {
      summary: [{ type: 'summary_text', text: kwargs.reasoning_content }],
    }
  }
  attachDashScopeReasoning(obj.chunk, seen)
  attachDashScopeReasoning(obj.data, seen)
  attachDashScopeReasoning(obj.kwargs, seen)
  attachDashScopeReasoning(obj.messages, seen)
}

function lastUserText(messages: ChatStreamDto['messages'] | undefined): string {
  if (!messages?.length) return ''
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i]
    if (msg.role !== 'user') continue
    const text = (msg.parts ?? [])
      .filter((p) => p.type === 'text' && p.text)
      .map((p) => p.text)
      .join('')
    return text.trim()
  }
  return ''
}

function titleFromQuestion(question: string) {
  const text = question.replace(/\s+/g, ' ').trim()
  return text.length > 30 ? `${text.slice(0, 30)}…` : text
}

function excerpt(content: string) {
  const text = content.replace(/\s+/g, ' ').trim()
  if (text.length <= EXCERPT_LEN) return text
  return `${text.slice(0, EXCERPT_LEN)}...`
}
