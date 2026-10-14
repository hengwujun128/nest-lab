/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-10-10 16:44:29
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-10-10 17:12:26
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/ai/chat.types.ts
 */
/** 返给前端的溯源条目（摘录，不含整块正文） */
export interface ChatSource {
  /** 资料编号，与回答中的 [n] 对应 */
  index: number
  documentId: string
  documentTitle: string
  heading: string | null
  excerpt: string
  score: number
}
