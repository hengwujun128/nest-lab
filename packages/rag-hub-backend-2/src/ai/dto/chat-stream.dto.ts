/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-10-14 15:17:00
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-10-14 15:18:50
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/ai/dto/chat-stream.dto.ts
 */
import { Type } from 'class-transformer'
import { Allow, IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

/** useChat Data Stream 请求体（额外字段放行） */
export class ChatStreamDto {
  @IsArray()
  messages!: Array<{
    role?: string
    parts?: Array<{ type?: string; text?: string }>
  }>

  @IsOptional()
  @IsString()
  sessionId?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  topK?: number

  @IsOptional()
  @IsString()
  id?: string

  @IsOptional()
  @Allow()
  trigger?: unknown

  @IsOptional()
  @Allow()
  messageId?: unknown
}
