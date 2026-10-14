/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-23 10:15:51
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-10-13 15:54:43
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/ai/dto/rag-search.dto.ts
 */
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

/** RAG 混合检索请求（不生成回答） */
export class RagSearchDto {
  @IsString()
  @IsNotEmpty()
  query!: string

  /** 精排后返回条数，默认 5 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number = 5
}
