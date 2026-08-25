/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-07-23 10:14:59
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-07-23 10:15:15
 * @Description:
 * @FilePath: /rag-hub-backend/src/common/snowflake-id.ts
 */
import SnowflakeId from 'snowflake-id'

const snowflake = new SnowflakeId({
  mid: Number(process.env.SNOWFLAKE_WORKER_ID ?? 1),
  offset: Number(process.env.SNOWFLAKE_OFFSET ?? 1704067200000),
})

/** 生成雪花 ID（string），对应 Java long / Postgres BIGINT */
export function nextSnowflakeId(): string {
  return snowflake.generate()
}
