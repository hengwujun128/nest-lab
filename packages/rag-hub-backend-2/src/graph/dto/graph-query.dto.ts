/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-17 09:09:16
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-18 10:22:45
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
