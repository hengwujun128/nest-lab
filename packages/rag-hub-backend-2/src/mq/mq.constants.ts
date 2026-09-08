/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-08-25 13:54:51
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-02 16:17:41
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/mq/mq.constants.ts
 */
/**
 * RabbitMQ 拓扑常量
 *
 * 交换机：rag.reindex
 * 队列名带 `kh.` 前缀，避免和本机同时跑的其他项目冲突。
 */

/* ----------------------------------- 交换机 ---------------------------------- */

/** RAG 语义检索交换机（topic） */
export const RAG_REINDEX_EXCHANGE = 'rag.reindex.exchange'

/** 文档级搜索(全文检索)交换机（topic） */
export const SEARCH_INDEX_EXCHANGE = 'search.index.exchange'

/** KG 知识图谱交换机（topic） */
export const KG_GRAPH_EXCHANGE = 'kg.graph.exchange'

/* ---------------------------------- 消息队列 ---------------------------------- */

/** 语义检索队列 */
export const RAG_REINDEX_QUEUE = 'kh.rag.reindex.queue'

/** 文档级搜索(全文检索)队列 */
export const SEARCH_INDEX_QUEUE = 'kh.search.index.queue'

/** KG 知识图谱队列 */
export const KG_GRAPH_QUEUE = 'kh.kg.graph.queue'

/* ----------------------------------- 路由键 ---------------------------------- */

/** 路由键：RAG 语义检索 */
export const RAG_RK_BY_IDS = 'rag.reindex.by_ids'

/** 路由键：RAG 语义检索删除 */
export const RAG_RK_DELETE = 'rag.reindex.delete'

/** 路由键：全文检索 */
export const SEARCH_RK_INDEX = 'search.index.document'

/** 路由键：全文检索删除 */
export const SEARCH_RK_DELETE = 'search.index.delete'

/** 路由键：KG 知识图谱 */
export const KG_RK_BUILD_BY_IDS = 'kg.graph.build_by_ids'

/** 路由键：KG 知识图谱删除 */
export const KG_RK_DELETE = 'kg.graph.delete'
