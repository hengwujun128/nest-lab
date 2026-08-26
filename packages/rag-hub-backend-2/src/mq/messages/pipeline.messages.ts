/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-08-25 13:54:51
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-08-26 10:41:10
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/mq/messages/pipeline.messages.ts
 */
/** RAG 重建索引消息 */
export type ReindexType = 'BY_DOC_IDS'

export interface ReindexMessage {
  taskId: string
  type: ReindexType
  documentIds?: string[]
}
