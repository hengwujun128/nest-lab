/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-15 16:19:17
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-16 09:56:42
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/user/dto/permission.dto.ts
 */
import { Type } from 'class-transformer'
import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class CreatePermissionDto {
  @IsString()
  permissionName!: string

  @IsString()
  permissionCode!: string

  @Type(() => Number)
  @IsInt()
  permissionType!: number

  @IsOptional()
  @IsString()
  parentId?: string

  @IsOptional()
  @IsString()
  menuUrl?: string

  @IsOptional()
  @IsString()
  apiUrl?: string

  @IsOptional()
  @IsString()
  method?: string

  @IsOptional()
  @IsString()
  icon?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number
}

export class UpdatePermissionDto {
  @IsOptional()
  @IsString()
  permissionName?: string

  @IsString()
  permissionCode!: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  permissionType?: number

  @IsOptional()
  @IsString()
  parentId?: string

  @IsOptional()
  @IsString()
  menuUrl?: string

  @IsOptional()
  @IsString()
  apiUrl?: string

  @IsOptional()
  @IsString()
  method?: string

  @IsOptional()
  @IsString()
  icon?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number
}

export class QueryPermissionDto {
  @IsOptional()
  @IsString()
  keyword?: string

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

export class AssignPermissionIdsDto {
  @IsArray()
  @IsString({ each: true })
  permissionIds!: string[]
}
