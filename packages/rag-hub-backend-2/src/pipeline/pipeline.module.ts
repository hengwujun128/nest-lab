/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-08-25 13:54:51
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-08-26 09:29:18
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/pipeline/pipeline.module.ts
 */
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { DocumentContent, DocumentContentSchema } from '../document/schemas/document-content.schema'
import { ChunkingService } from './chunking.service'
import { EmbeddingService } from './embedding.service'
import { PipelineOrchestrator } from './pipeline.orchestrator'
import { VectorIndexService } from './vector-index.service'

@Module({
  imports: [MongooseModule.forFeature([{ name: DocumentContent.name, schema: DocumentContentSchema }])],
  providers: [ChunkingService, EmbeddingService, VectorIndexService, PipelineOrchestrator],
  exports: [PipelineOrchestrator, VectorIndexService],
})
export class PipelineModule {}
