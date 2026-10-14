/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-23 10:15:51
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-10-14 10:29:23
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/ai/dto/chat.dto.ts
 */
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

/** RAG 对话请求 */
export class ChatDto {
  /** 已有会话；不传则新建 */
  @IsOptional()
  @IsString()
  sessionId?: string

  /** 用户问题 */
  @IsString()
  @IsNotEmpty()
  content!: string

  /** 召回块数，默认 5 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  topK?: number = 5
}
