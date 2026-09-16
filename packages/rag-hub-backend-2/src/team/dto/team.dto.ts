/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-15 16:19:17
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-16 15:21:48
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/team/dto/team.dto.ts
 */
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateTeamDto {
  @IsString()
  teamName?: string

  @IsOptional()
  @IsString()
  teamCode?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  leaderId?: string

  @IsOptional()
  @IsString()
  parentId?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number
}

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  teamName?: string

  @IsOptional()
  @IsString()
  teamCode?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  leaderId?: string

  @IsOptional()
  @IsString()
  parentId?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number
}

export class QueryTeamDto {
  @IsOptional()
  @IsString()
  keyword?: string

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
