import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectEntityManager } from '@nestjs/typeorm'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { EntityManager, IsNull } from 'typeorm'
import { nextSnowflakeId } from '../common/snowflake-id'
import { DocumentPipelinePublisher } from '../mq/document-pipeline.publisher'
import { canSubmitReview, DocumentStatus } from './document-status'
import { DocumentEntity } from './entities/document.entity'
import { DocumentReviewEntity, ReviewResult } from './entities/document-review.entity'
import { DocumentContent, DocumentContentDocument } from './schemas/document-content.schema'
import { QueryReviewTasksDto } from './dto/review.dto'
import type { AuthUser } from '../auth/auth-user.interface'

/**
 * 文档发布审核服务
 *
 * 与 kh_document_review 表对应：每次 submit 插入一条记录，approve/reject 回填结果。
 * 开关：环境变量 DOCUMENT_REQUIRE_APPROVAL（默认 true；false 时 publish 跳过本服务直接发布）。
 */
@Injectable()
export class DocumentReviewService {
  private readonly logger = new Logger(DocumentReviewService.name)

  constructor(
    @InjectEntityManager()
    private readonly em: EntityManager,
    @InjectModel(DocumentContent.name)
    private readonly contentModel: Model<DocumentContentDocument>,
    private readonly pipelinePublisher: DocumentPipelinePublisher,
    private readonly config: ConfigService,
  ) {}

  /** 是否开启发布审核（默认 true，DOCUMENT_REQUIRE_APPROVAL=false 时免审） */
  isRequireApproval(): boolean {
    return this.config.get<string>('DOCUMENT_REQUIRE_APPROVAL', 'true') !== 'false'
  }

  /**
   * 提交审核：Draft / Published → PendingReview
   * 若来自 Published，先清索引（审核期间不可检索）
   */
  async submitForReview(documentId: string, actor?: AuthUser): Promise<DocumentEntity> {
    const doc = await this.findDocumentOrThrow(documentId)

    if (!canSubmitReview(doc.status)) {
      throw new BadRequestException('只有草稿或已发布状态的文档才能提交审核')
    }

    // 检查是文档否已有待审记录
    const pending = await this.em.findOne(DocumentReviewEntity, {
      where: { documentId, reviewResult: IsNull() },
    })
    // NOTE: 同一文档同时只能有一条待审记录
    if (pending) {
      throw new BadRequestException('该文档已有待审核任务')
    }
    // 当前文档的状态
    const beforeStatus = doc.status

    // 为当前文档创建一条审批记录并保存
    const review = this.em.create(DocumentReviewEntity, {
      id: nextSnowflakeId(),
      documentId,
      beforeStatus,
    })
    await this.em.save(review)

    // 为文档新增一条待审记录后，并同步更新文档状态并保存
    doc.status = DocumentStatus.PendingReview
    if (actor?.userId) doc.updateBy = actor.userId
    const saved = await this.em.save(doc)

    // NOTE: 如果文档之前是已发布状态，则清理索引
    // 意味着, 文档可以从草稿状态和已发布状态 进行 提交审核 操作
    if (beforeStatus === DocumentStatus.Published) {
      await this.safeUnpublish(documentId)
    }

    this.logger.log(`文档已提交审核：documentId=${documentId}, reviewId=${review.id}, beforeStatus=${beforeStatus}`)
    return saved
  }

  /** 审核通过 → Published + 重建索引 */
  async approveReview(
    reviewId: string,
    reviewerId?: string,
    reviewerName?: string,
    reviewComment?: string,
  ): Promise<DocumentEntity> {
    // 1. 先更新审核记录及其相关信息
    const review = await this.findPendingReviewOrThrow(reviewId)

    review.reviewResult = ReviewResult.Approved
    review.reviewerId = reviewerId ?? null
    review.reviewerName = reviewerName ?? '审核员'
    review.reviewComment = reviewComment ?? null
    review.reviewedAt = new Date()
    await this.em.save(review)

    // 2. 更新文档状态并保存(审核通过后, 文档状态变为已发布状态)
    const doc = await this.findDocumentOrThrow(review.documentId)
    doc.status = DocumentStatus.Published
    doc.publishTime = new Date()
    const saved = await this.em.save(doc)

    // 3. 重建索引(先从mongoDB中获取文档内容,在进行消息投递)
    await this.safePublish(saved)

    this.logger.log(`审核通过：reviewId=${reviewId}, documentId=${doc.id}`)
    return saved
  }

  /** 审核驳回 → Draft */
  async rejectReview(
    reviewId: string,
    reviewComment: string,
    reviewerId?: string,
    reviewerName?: string,
  ): Promise<DocumentEntity> {
    if (!reviewComment?.trim()) {
      throw new BadRequestException('驳回意见不能为空')
    }
    // 1. 先更新审核记录及其相关信息
    const review = await this.findPendingReviewOrThrow(reviewId)

    review.reviewResult = ReviewResult.Rejected
    review.reviewerId = reviewerId ?? null
    review.reviewerName = reviewerName ?? '审核员'
    review.reviewComment = reviewComment.trim()
    review.reviewedAt = new Date()
    await this.em.save(review)

    // 2. 更新文档状态并保存(审核驳回后, 文档状态变为草稿状态)
    const doc = await this.findDocumentOrThrow(review.documentId)
    doc.status = DocumentStatus.Draft
    const saved = await this.em.save(doc)

    this.logger.log(`审核驳回：reviewId=${reviewId}, documentId=${doc.id}`)
    return saved
  }

  /** 待办 / 已通过 / 已驳回 列表 */
  async listTasks(query: QueryReviewTasksDto) {
    // 1. 创建查询构建器
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const qb = this.em.createQueryBuilder(DocumentReviewEntity, 'r')

    // 未传 status：不过滤，返回全部（待审 / 已通过 / 已驳回）
    if (query.status === 'pending') {
      qb.andWhere('r.review_result IS NULL')
    } else if (query.status === 'approved') {
      qb.andWhere('r.review_result = :result', {
        result: ReviewResult.Approved,
      })
    } else if (query.status === 'rejected') {
      qb.andWhere('r.review_result = :result', {
        result: ReviewResult.Rejected,
      })
    }

    qb.orderBy('r.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [items, total] = await qb.getManyAndCount()
    return { items, total, page, pageSize }
  }

  // 获取待审核记录数量
  async getPendingCount(): Promise<number> {
    return this.em.count(DocumentReviewEntity, {
      where: { reviewResult: IsNull() },
    })
  }

  /** 该文档当前待审任务, 只有一条待审记录（无则 null） */
  async getCurrentReview(documentId: string) {
    return this.em.findOne(DocumentReviewEntity, {
      where: { documentId, reviewResult: IsNull() },
      order: { createdAt: 'DESC' },
    })
  }

  /** 该文档全部审核记录（含已通过、已驳回） */
  async getReviewHistory(documentId: string) {
    return this.em.find(DocumentReviewEntity, {
      where: { documentId },
      order: { createdAt: 'DESC' },
    })
  }

  // 查找文档 待审记录, 并检查是否已处理
  private async findPendingReviewOrThrow(reviewId: string) {
    const review = await this.em.findOne(DocumentReviewEntity, {
      where: { id: reviewId },
    })
    if (!review) {
      throw new NotFoundException(`Review ${reviewId} not found`)
    }
    if (review.reviewResult != null) {
      throw new BadRequestException('该审核任务已处理')
    }
    return review
  }

  // 查找文档, 并检查是否已删除
  private async findDocumentOrThrow(id: string) {
    const doc = await this.em.findOne(DocumentEntity, {
      where: { id, deleted: false },
    })
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`)
    }
    return doc
  }

  private async loadContent(contentId: string): Promise<string> {
    const contentDoc = await this.contentModel.findOne({ _id: contentId, deleted: false }).lean()
    return contentDoc?.content ?? ''
  }

  private async safePublish(doc: DocumentEntity) {
    try {
      await this.pipelinePublisher.afterPublish(doc)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`审核通过后索引投递失败：documentId=${doc.id}, ${message}`)
    }
  }

  private async safeUnpublish(documentId: string) {
    try {
      await this.pipelinePublisher.afterUnpublish(documentId)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`提交审核后索引清理失败：documentId=${documentId}, ${message}`)
    }
  }
}
