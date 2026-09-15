/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-14 11:35:28
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-14 16:04:16
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/user/dto/query-user.dto.ts
 */
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

/** 用户分页列表查询 */
export class QueryUserDto {
  @IsOptional()
  @IsString()
  keyword?: string

  /** 按角色编码筛选，如 ROLE_REVIEWER */
  @IsOptional()
  @IsString()
  roleCode?: string

  /** 0 禁用 1 启用 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number

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
