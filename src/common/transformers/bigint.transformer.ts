/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-07-22 17:23:09
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-07-23 09:29:42
 * @Description:
 * @FilePath: /rag-hub-backend/src/common/transformers/bigint.transformer.ts
 */
import { ValueTransformer } from 'typeorm'

/**
 * Postgres BIGINT ↔ JS string
 * 雪花 ID 超过 Number 安全整数范围，必须用字符串，否则会丢精度。
 */

export const bigintTransformer: ValueTransformer = {
  to: (v: string | null) => v, // 写入：原样交给驱动
  from: (v: string | null) => (v == null ? v : String(v)), // 读出：统一转成 string
}
