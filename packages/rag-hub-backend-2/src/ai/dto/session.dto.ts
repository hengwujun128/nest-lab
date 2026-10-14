/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-10-10 16:44:29
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-10-13 15:55:03
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/ai/dto/session.dto.ts
 */
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'

/** 会话列表分页 */
export class QuerySessionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20
}

/** 新建空会话 */
export class CreateSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string
}

/** 重命名会话 */
export class UpdateSessionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string
}
