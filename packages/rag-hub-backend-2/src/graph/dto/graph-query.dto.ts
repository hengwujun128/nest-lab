/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-17 09:09:16
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-29 11:40:31
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/graph/dto/graph-query.dto.ts
 */
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator'

export class GraphQueryDto {
  @IsOptional()
  @IsString()
  type?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number
}

export class GraphSearchDto {
  @IsString()
  @MinLength(1)
  keyword!: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number
}

/** 全景图查询 */
export class GraphOverviewDto {
  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @IsString()
  entityType?: string

  /** 文档 updatedAt 下界，ISO 字符串 */
  @IsOptional()
  @IsString()
  from?: string

  @IsOptional()
  @IsString()
  to?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(80)
  docLimit?: number
}
