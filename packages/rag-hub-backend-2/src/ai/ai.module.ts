/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-23 10:39:43
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-10-13 15:57:49
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/ai/ai.module.ts
 */
import { Module } from '@nestjs/common'
import { PipelineModule } from '../pipeline/pipeline.module'

import { AiChatService } from './ai-chat.service'
import { ChatSessionService } from './chat-session.service'

import { AiController } from './ai.controller'

import { HybridRetrievalService } from './hybrid-retrieval.service'
import { RerankerService } from './reranker.service'

@Module({
  imports: [PipelineModule],
  controllers: [AiController],
  providers: [AiChatService, ChatSessionService, HybridRetrievalService, RerankerService],
})
export class AiModule {}
