import { Client } from '@elastic/elasticsearch'
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ChunkHit, DocumentChunk } from './types/pipeline.types'

/** RAG 分块向量索引名 */
const CHUNK_INDEX = 'kh_chunk'

/**
 * 向量索引存储
 *
 * <p>写入 Elasticsearch `kh_chunk`，字段含 dense_vector(embedding)，供后续 kNN / 混合检索。</p>
 *
 * <p>职责：</p>
 * - 启动时确保索引 mapping 存在（含 dense_vector）
 * - 按 document_id 删除旧块（重建前先清）
 * - bulk 写入带 embedding 的 chunk
 */
@Injectable()
export class VectorIndexService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VectorIndexService.name)
  private es: Client | null = null
  private readonly esEnabled: boolean
  private readonly embeddingDims: number

  constructor(private readonly config: ConfigService) {
    this.esEnabled = this.config.get<string>('ELASTICSEARCH_ENABLED', 'true') !== 'false'
    this.embeddingDims = Number(config.get('EMBEDDING_DIMENSION', 1024))
  }

  async onModuleInit() {
    if (!this.esEnabled) {
      this.logger.warn('Elasticsearch 已禁用，RAG 向量索引将跳过写入')
      return
    }

    const node = this.config.get<string>('ELASTICSEARCH_NODE', 'http://localhost:9200')
    this.es = new Client({ node })
    try {
      // 这是问 ES 集群：「你还活着吗？状态如何？」
      const health = await this.es.cluster.health()
      this.logger.log(`VectorIndex ES 已连接：${node}, status=${health.status}`)
      await this.createIndexIfNotExists()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Elasticsearch 不可用，RAG 向量写入将跳过：${message}`)
      this.es = null
    }
  }

  async onModuleDestroy() {
    await this.es?.close()
  }

  /** 删除某文档全部向量块（发布重建 / 下架时调用）。 */
  async deleteByDocId(documentId: string) {
    if (!this.es) {
      this.logger.warn(`跳过删除向量块（ES 不可用）：documentId=${documentId}`)
      return
    }

    try {
      await this.es.deleteByQuery({
        index: CHUNK_INDEX,
        query: {
          term: { document_id: documentId },
        },
        refresh: true,
      })
      this.logger.log(`已从 ES 删除文档向量块：documentId=${documentId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      // 索引尚不存在时忽略
      if (message.includes('index_not_found')) {
        return
      }
      this.logger.error(`ES 删除文档块失败：documentId=${documentId}, error=${message}`)
    }
  }

  /** bulk 写入 / 覆盖 chunk（_id = chunkId）。 */
  async indexChunks(chunks: DocumentChunk[]) {
    if (!chunks.length) return

    if (!this.es) {
      this.logger.warn(`跳过向量索引写入（ES 不可用）：chunks=${chunks.length}`)
      return
    }

    await this.createIndexIfNotExists()

    const operations = chunks.flatMap((chunk) => [
      { index: { _index: CHUNK_INDEX, _id: chunk.chunkId } },
      this.buildDocMap(chunk),
    ])

    const response = await this.es.bulk({
      refresh: true,
      operations,
    })

    if (response.errors) {
      const failed = response.items
        .filter((item) => item.index?.error)
        .map((item) => `${item.index?._id}: ${item.index?.error?.reason ?? 'unknown'}`)
      this.logger.error(`ES 批量索引部分失败：${failed.join(', ')}`)
      throw new Error(`ES 批量索引部分失败：${failed.length} 条`)
    }

    this.logger.log(`ES 批量索引成功：${chunks.length} chunks → ${CHUNK_INDEX}`)
  }

  /**
   * BM25 关键词检索（content + document_title，ik_smart）。
   * ES 不可用时返回 []。
   */
  async keywordSearch(query: string, topK = 20): Promise<ChunkHit[]> {
    if (!this.es) {
      this.logger.warn('跳过关键词检索（ES 不可用）')
      return []
    }
    const trimmed = query.trim()
    if (!trimmed) return []

    const k = this.clampTopK(topK)
    try {
      const response = await this.es.search({
        index: CHUNK_INDEX, // 从这个索引中查询
        size: k, // 返回的结果数量
        query: {
          // 查询条件：多字段匹配
          multi_match: {
            query: trimmed, // 查询词
            fields: ['document_title^2', 'content'], // 字段权重
            analyzer: 'ik_smart', // 分词器
          },
        },
        // 返回的字段：这些字段会被返回
        _source: ['chunk_id', 'document_id', 'document_title', 'content', 'heading'],
      })
      return this.mapHits(response.hits.hits)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`关键词检索失败：${message}`)
      return []
    }
  }

  /**
   * kNN 检索知识块（cosine）。
   * ES 不可用或索引为空时返回 []。
   */
  async knnSearch(queryVector: number[], topK = 20): Promise<ChunkHit[]> {
    if (!this.es) {
      this.logger.warn('跳过向量检索（ES 不可用）')
      return []
    }
    if (!queryVector.length) return []

    const k = this.clampTopK(topK)
    try {
      const response = await this.es.search({
        index: CHUNK_INDEX, // 从这个索引中查询
        size: k, // 返回的结果数量
        // NOTE: knn 检索的参数
        knn: {
          field: 'embedding', // 使用 embedding 字段
          query_vector: queryVector, // 查询向量
          k, // 返回的结果数量
          num_candidates: Math.max(k * 10, 50), // 候选数量
        },
        // 返回的字段：这些字段会被返回
        _source: ['chunk_id', 'document_id', 'document_title', 'content', 'heading'],
      })
      return this.mapHits(response.hits.hits)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`向量检索失败：${message}`)
      return []
    }
  }

  /**
   * 混合检索粗排：关键词 + 向量并行召回，再按 chunkId 做 RRF 融合。
   * 嵌入失败或未传入时只走关键词。
   */
  async searchHybrid(params: {
    query: string
    queryVector?: number[] | null
    hybridTopK?: number
    rrfC?: number
  }): Promise<ChunkHit[]> {
    // 设置混合检索的 topK
    const hybridTopK = this.clampTopK(params.hybridTopK ?? 20)
    // 设置 RRF 的 C 值
    const rrfC = params.rrfC && params.rrfC > 0 ? params.rrfC : 60

    // 关键词的检索结果,向量检索的结果
    const [keywordHits, vectorHits] = await Promise.all([
      // 关键词检索
      this.keywordSearch(params.query, hybridTopK),
      // 向量检索
      params.queryVector?.length ? this.knnSearch(params.queryVector, hybridTopK) : Promise.resolve([] as ChunkHit[]),
    ])

    // TIPS: 融合关键词和向量检索结果,使用 RRF 融合算法进行融合
    const fused = this.rrfFuse(keywordHits, vectorHits, rrfC)
    this.logger.log(`混合检索 RRF：keyword=${keywordHits.length}, vector=${vectorHits.length}, fused=${fused.length}`)
    // 返回融合后的结果
    return fused
  }

  private clampTopK(topK: number): number {
    return Math.min(Math.max(topK, 1), 50)
  }

  private mapHits(
    hits: Array<{
      _id?: string
      _score?: number | null
      _source?: unknown
    }>,
  ): ChunkHit[] {
    return hits.map((hit) => {
      const src = (hit._source ?? {}) as Record<string, unknown>
      return {
        chunkId: String(src.chunk_id ?? hit._id),
        documentId: String(src.document_id ?? ''),
        documentTitle: String(src.document_title ?? ''),
        content: String(src.content ?? ''),
        heading: (src.heading as string | null) ?? null,
        score: hit._score ?? 0,
      }
    })
  }

  /**
   * Reciprocal Rank Fusion：score(d) = Σ 1 / (C + rank_r(d))
   * 两路各自按原始得分排序后再算排名。
   */
  private rrfFuse(keywordHits: ChunkHit[], vectorHits: ChunkHit[], rrfC: number): ChunkHit[] {
    const fused = new Map<string, ChunkHit>()

    const addChannel = (hits: ChunkHit[], channel: 'keyword' | 'vector') => {
      // TIPS: 对结果进行排序，按照得分从高到低排序
      const sorted = [...hits].sort((a, b) => b.score - a.score)
      // TIPS: 遍历排序后的结果
      sorted.forEach((hit, rank) => {
        // TIPS: 计算 RRF 得分(d) = Σ 1 / (C + rank_r(d))
        const rrf = 1 / (rrfC + rank + 1)
        // TIPS: 获取已有的结果
        const existing = fused.get(hit.chunkId)
        // TIPS: 如果已有的结果不存在，则添加新的结果
        if (!existing) {
          // TIPS: 添加新的结果
          fused.set(hit.chunkId, {
            ...hit,
            score: rrf,
            bm25Score: channel === 'keyword' ? hit.score : 0,
            vectorScore: channel === 'vector' ? hit.score : 0,
          })
          return
        }
        // TIPS: 如果已有的结果存在，则更新得分
        existing.score += rrf
        // TIPS: 如果关键词的得分，则更新关键词得分
        if (channel === 'keyword') existing.bm25Score = hit.score
        // TIPS: 如果向量检索的得分，则更新向量检索得分
        if (channel === 'vector') existing.vectorScore = hit.score
      })
    }

    addChannel(keywordHits, 'keyword')
    addChannel(vectorHits, 'vector')

    return [...fused.values()].sort((a, b) => b.score - a.score)
  }

  /**
   * 创建 kh_chunk 索引（含 dense_vector）。
   * document_id 用 keyword：雪花 ID 以字符串传递，避免 JS long 精度问题。
   */
  private async createIndexIfNotExists() {
    if (!this.es) return

    const exists = await this.es.indices.exists({ index: CHUNK_INDEX })
    if (exists) return

    try {
      await this.es.indices.create({
        index: CHUNK_INDEX,
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          refresh_interval: '5s',
        },
        mappings: {
          properties: {
            chunk_id: { type: 'keyword' },
            document_id: { type: 'keyword' },
            document_title: {
              type: 'text',
              fields: { keyword: { type: 'keyword' } },
              // 分词器
              analyzer: 'ik_max_word',
              search_analyzer: 'ik_smart',
            },
            content: {
              type: 'text',
              // 分词器
              analyzer: 'ik_max_word',
              search_analyzer: 'ik_smart',
            },
            heading: { type: 'keyword' },
            chunk_index: { type: 'integer' },
            total_chunks: { type: 'integer' },
            category_id: { type: 'keyword' },
            author_id: { type: 'keyword' },
            team_id: { type: 'keyword' },
            doc_status: { type: 'integer' },
            publish_time: { type: 'date' },
            indexed_at: { type: 'date' },
            embedding: {
              type: 'dense_vector',
              dims: this.embeddingDims,
              index: true,
              similarity: 'cosine',
            },
          },
        },
      })
      this.logger.log(`ES 索引创建成功：index=${CHUNK_INDEX}, dims=${this.embeddingDims}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('resource_already_exists')) {
        return
      }
      this.logger.error(`ES 索引创建失败：${message}`)
      throw error
    }
  }

  private buildDocMap(chunk: DocumentChunk): Record<string, unknown> {
    const doc: Record<string, unknown> = {
      chunk_id: chunk.chunkId,
      document_id: chunk.documentId,
      document_title: chunk.documentTitle,
      content: chunk.content,
      heading: chunk.heading ?? null,
      chunk_index: chunk.chunkIndex,
      total_chunks: chunk.totalChunks,
      category_id: chunk.categoryId ?? null,
      author_id: chunk.authorId ?? null,
      team_id: chunk.teamId ?? null,
      doc_status: chunk.docStatus ?? null,
      publish_time: chunk.publishTime ?? null,
      indexed_at: new Date().toISOString(),
    }
    if (chunk.embedding?.length) {
      doc.embedding = chunk.embedding
    }
    return doc
  }
}
