/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-17 09:09:16
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-17 10:39:44
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/search/dto/search.dto.ts
 */
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

/** 全文搜索请求 */
export class SearchDocumentsDto {
  @IsString()
  @IsNotEmpty()
  keyword!: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 10

  @IsOptional()
  @IsString()
  categoryId?: string

  @IsOptional()
  @IsString()
  authorId?: string
}
