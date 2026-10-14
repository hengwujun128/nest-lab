/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-23 10:15:51
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-10-14 10:28:38
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/ai/ai.controller.ts
 */
import { Body, Controller, Post, Get, Query, Param, Patch, Delete } from '@nestjs/common'
import { AiChatService } from './ai-chat.service'
import { HybridRetrievalService } from './hybrid-retrieval.service'
import { ChatSessionService } from './chat-session.service'

import { ChatDto } from './dto/chat.dto'
import { RagSearchDto } from './dto/rag-search.dto'
import { CreateSessionDto, QuerySessionDto, UpdateSessionDto } from './dto/session.dto'

import { RequirePermission } from '../auth/decorators/require-permission.decorator'
import { PermissionCode } from '../common/constants/permissions'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/auth-user.interface'

@Controller()
export class AiController {
  constructor(
    private readonly aiChat: AiChatService,
    private readonly retrieval: HybridRetrievalService,
    private readonly sessions: ChatSessionService,
  ) {}

  /**
   * RAG 混合检索：关键词 BM25 + 向量 kNN → RRF → rerank。
   * 不调用 LLM，只返回 kh_chunk 命中。
   */
  @Post('rag/search')
  @RequirePermission(PermissionCode.search)
  search(@Body() dto: RagSearchDto) {
    return this.retrieval.retrieve(dto.query.trim(), dto.topK ?? 5)
  }

  /** RAG 对话：混合检索后再作答 */
  @Post('ai/chat')
  @RequirePermission(PermissionCode.search)
  chat(@Body() dto: ChatDto, @CurrentUser() user: AuthUser) {
    return this.aiChat.chat(dto.content, dto.topK ?? 5, user, dto.sessionId)
  }

  /* -------------------------------------------------------------------------- */
  /*                                   用户会话部分                                   */
  /* -------------------------------------------------------------------------- */

  /** 获取登录用户的会话列表 */
  @Get('ai/sessions')
  @RequirePermission(PermissionCode.search)
  listSessions(@Query() query: QuerySessionDto, @CurrentUser() user: AuthUser) {
    return this.sessions.pageMine(user.userId, query)
  }

  /** 创建新的会话 */
  @Post('ai/sessions')
  @RequirePermission(PermissionCode.search)
  createSession(@Body() dto: CreateSessionDto, @CurrentUser() user: AuthUser) {
    return this.sessions.create(user.userId, dto)
  }

  /** 获取会话的对话记录 */
  @Get('ai/sessions/:id/messages')
  @RequirePermission(PermissionCode.search)
  listMessages(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.sessions.listMessages(user.userId, id)
  }

  /** 重命名会话 */
  @Patch('ai/sessions/:id')
  @RequirePermission(PermissionCode.search)
  renameSession(@Param('id') id: string, @Body() dto: UpdateSessionDto, @CurrentUser() user: AuthUser) {
    return this.sessions.rename(user.userId, id, dto)
  }

  /** 删除会话 */
  @Delete('ai/sessions/:id')
  @RequirePermission(PermissionCode.search)
  removeSession(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.sessions.remove(user.userId, id)
  }
}
