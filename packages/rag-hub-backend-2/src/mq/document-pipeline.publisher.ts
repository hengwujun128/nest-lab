/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-08-25 13:54:51
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-17 10:16:18
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/mq/document-pipeline.publisher.ts
 */
import { Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { DocumentEntity } from '../document/entities/document.entity'
import {
  // RAG 语义检索相关
  RAG_REINDEX_EXCHANGE,
  RAG_RK_BY_IDS,
  RAG_RK_DELETE,
  // 全文检索相关
  SEARCH_INDEX_EXCHANGE,
  SEARCH_RK_INDEX,
  SEARCH_RK_DELETE,
  // KG 知识图谱相关
  KG_GRAPH_EXCHANGE,
  KG_RK_BUILD_BY_IDS,
  KG_RK_DELETE,
} from './mq.constants'
import { ReindexMessage, SearchIndexMessage, KgBuildMessage } from './messages/pipeline.messages'
import { RabbitMqService } from './rabbitmq.service'

/**
 * 文档发布后的知识管线「生产者」
 *
 * <p>触发：RAG 向量化。</p>
 * <p>约定：投递失败只打日志，<b>不回滚</b>文档已发布状态。</p>
 */
@Injectable()
export class DocumentPipelinePublisher {
  private readonly logger = new Logger(DocumentPipelinePublisher.name)

  constructor(private readonly rabbit: RabbitMqService) {}

  /** 发布成功后调用：投递 RAG 分块向量化任务|全文检索索引
   * @param document Mongo 正文，用于 Search 消息附带 content 前缀快照
   */
  async afterPublish(document: DocumentEntity) {
    await Promise.all([
      this.triggerRagReindex(document.id),
      // this.triggerSearchIndex(document, content),
      this.triggerSearchIndex(document.id),
      this.triggerKgBuild(document.id),
    ])
  }

  /** 归档/删除后：通知 RAG / Search 按文档 ID 清理索引 */
  async afterUnpublish(documentId: string) {
    await Promise.all([
      this.triggerRagDelete(documentId),
      this.triggerSearchDelete(documentId),
      this.triggerKgDelete(documentId),
    ])
  }

  /** RAG：按文档 ID 重建向量块 */
  private async triggerRagReindex(documentId: string) {
    const message: ReindexMessage = {
      taskId: randomUUID(),
      type: 'BY_DOC_IDS',
      documentIds: [documentId],
    }
    const ok = await this.rabbit.publish(RAG_REINDEX_EXCHANGE, RAG_RK_BY_IDS, message)
    this.logger.log(`RAG 重建索引${ok ? '已投递' : '投递失败'}：documentId=${documentId}, taskId=${message.taskId}`)
  }

  /** RAG：按文档 ID 删除向量块 */
  private async triggerRagDelete(documentId: string) {
    const message: ReindexMessage = {
      taskId: randomUUID(),
      type: 'DELETE_BY_DOC_IDS',
      documentIds: [documentId],
    }
    const ok = await this.rabbit.publish(RAG_REINDEX_EXCHANGE, RAG_RK_DELETE, message)
    this.logger.log(`RAG 删除${ok ? '已投递' : '投递失败'}：documentId=${documentId}, taskId=${message.taskId}`)
  }

  /** 全文检索：按文档 ID 重建索引 */
  /**
   * Search：只投递文档 ID，消费者需要再查库(Postgres + Mongo 拉全文再写 ES)才能写索引。
   * 原因: 避免 MQ 消息体积过大,影响性能。
   */
  private async triggerSearchIndex(documentId: string) {
    const message: SearchIndexMessage = {
      taskId: randomUUID(),
      type: 'INDEX',
      documentId: documentId,
    }
    const ok = await this.rabbit.publish(SEARCH_INDEX_EXCHANGE, SEARCH_RK_INDEX, message)
    this.logger.log(`ES 搜索索引${ok ? '已投递' : '投递失败'}：documentId=${documentId}, taskId=${message.taskId}`)
  }

  /** 全文检索：按文档 ID 删除索引 */
  private async triggerSearchDelete(documentId: string) {
    const message: SearchIndexMessage = {
      taskId: randomUUID(),
      type: 'DELETE',
      documentId,
    }
    const ok = await this.rabbit.publish(SEARCH_INDEX_EXCHANGE, SEARCH_RK_DELETE, message)
    this.logger.log(`ES 搜索索引${ok ? '已投递' : '投递失败'}：documentId=${documentId}, taskId=${message.taskId}`)
  }

  /** KG：按文档 ID 建图谱 */
  private async triggerKgBuild(documentId: string) {
    const message: KgBuildMessage = {
      taskId: randomUUID(),
      type: 'BUILD_BY_DOC_IDS',
      documentIds: [documentId],
    }
    const ok = await this.rabbit.publish(KG_GRAPH_EXCHANGE, KG_RK_BUILD_BY_IDS, message)
    this.logger.log(`KG 建图${ok ? '已投递' : '投递失败'}：documentId=${documentId}, taskId=${message.taskId}`)
  }

  /** KG：按文档 ID 删除图谱 */
  private async triggerKgDelete(documentId: string) {
    const message: KgBuildMessage = {
      taskId: randomUUID(),
      type: 'DELETE_BY_DOC_IDS',
      documentIds: [documentId],
    }
    const ok = await this.rabbit.publish(KG_GRAPH_EXCHANGE, KG_RK_DELETE, message)
    this.logger.log(`KG 删图${ok ? '已投递' : '投递失败'}：documentId=${documentId}, taskId=${message.taskId}`)
  }

  /** 组装写入 ES kh_document 的文档快照 */
  private buildSearchIndexData(document: DocumentEntity, content?: string | null): Record<string, unknown> {
    let contentPreview: string | undefined
    if (content) {
      contentPreview = content.length > 1000 ? content.substring(0, 1000) : content
    }

    return {
      id: document.id,
      title: document.title,
      summary: document.summary ?? null,
      content: contentPreview ?? null,
      categoryId: document.categoryId ?? null,
      tags: document.tags ?? null,
      status: document.status,
      isPublic: document.isPublic,
      viewCount: document.viewCount,
      likeCount: document.likeCount,
      commentCount: document.commentCount,
      authorId: document.authorId ?? null,
      publishTime: document.publishTime?.toISOString() ?? null,
      createdAt: document.createdAt?.toISOString() ?? null,
      updatedAt: document.updatedAt?.toISOString() ?? null,
    }
  }
}
