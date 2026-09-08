/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-08-25 13:54:51
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-02 16:39:02
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/mq/document-pipeline.consumer.ts
 */
import { Injectable, Logger } from '@nestjs/common'
import { ConsumeMessage } from 'amqplib'
import { PipelineOrchestrator } from '../pipeline/pipeline.orchestrator'
import { KG_GRAPH_QUEUE, RAG_REINDEX_QUEUE, SEARCH_INDEX_QUEUE } from './mq.constants'
import { KgBuildMessage, ReindexMessage, SearchIndexMessage } from './messages/pipeline.messages'
import { RabbitMqService } from './rabbitmq.service'

/**
 * 文档发布后管线的 MQ 消费者
 *
 * <p>消费：RAG 向量化。</p>
 * <p>注册时机：在构造函数里 `registerHandler`，</p>
 * 保证早于 {@link RabbitMqService.onModuleInit} 的 `bindConsumers`。
 */
@Injectable()
export class DocumentPipelineConsumer {
  private readonly logger = new Logger(DocumentPipelineConsumer.name)

  constructor(
    private readonly rabbit: RabbitMqService,
    private readonly orchestrator: PipelineOrchestrator,
  ) {
    // 注册 RAG 语义检索消费者
    this.rabbit.registerHandler(RAG_REINDEX_QUEUE, (msg) => this.handleRag(msg))
    // 注册全文检索消费者
    this.rabbit.registerHandler(SEARCH_INDEX_QUEUE, (msg) => this.handleSearch(msg))
    // 注册 KG 知识图谱消费者
    this.rabbit.registerHandler(KG_GRAPH_QUEUE, (msg) => this.handleKg(msg))
  }

  /** RAG：分块 → 向量化 → ES kh_chunk（dense_vector） */
  private async handleRag(msg: ConsumeMessage) {
    const body = this.parseJson<ReindexMessage>(msg)
    this.logger.log(
      `[RAG] type=${body.type}, taskId=${body.taskId}, documentIds=${JSON.stringify(body.documentIds ?? [])}`,
    )
    await this.orchestrator.handleRagReindex(body.type, body.documentIds)
  }

  /** Search：文档级关键词索引（Elasticsearch kh_document） */
  private async handleSearch(msg: ConsumeMessage) {
    const body = this.parseJson<SearchIndexMessage>(msg)
    this.logger.log(`[Search] type=${body.type}, taskId=${body.taskId}, documentId=${body.documentId}`)
    await this.orchestrator.handleSearchIndex(body.type, body.documentId, body.document)
  }

  /** KG：分块 → 抽实体关系 → Neo4j */
  private async handleKg(msg: ConsumeMessage) {
    const body = this.parseJson<KgBuildMessage>(msg)
    this.logger.log(
      `[KG] type=${body.type}, taskId=${body.taskId}, documentIds=${JSON.stringify(body.documentIds ?? [])}`,
    )
    await this.orchestrator.handleKgBuild(body.type, body.documentIds)
  }

  private parseJson<T>(msg: ConsumeMessage): T {
    return JSON.parse(msg.content.toString('utf8')) as T
  }
}
