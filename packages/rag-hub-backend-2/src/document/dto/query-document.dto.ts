/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-07-23 10:46:24
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-07-23 10:46:37
 * @Description:
 * @FilePath: /rag-hub-backend/src/document/dto/query-document.dto.ts
 */
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

/** 文档列表查询 */
export class QueryDocumentDto {
  /** 标题（模糊） */
  @IsOptional()
  @IsString()
  title?: string

  /** 分类 ID */
  @IsOptional()
  @IsString()
  categoryId?: string

  /** 团队 ID */
  @IsOptional()
  @IsString()
  teamId?: string

  /** 作者 ID */
  @IsOptional()
  @IsString()
  authorId?: string

  /** 状态 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number

  /** 页码，从 1 开始 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  /** 每页条数 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20
}
