/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-14 11:35:28
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-14 16:04:28
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/user/dto/create-user.dto.ts
 */
import { IsArray, IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator'

/** 管理员创建用户 */
export class CreateUserDto {
  @IsString()
  username!: string

  @IsString()
  @MinLength(6)
  password!: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  realName?: string

  @IsOptional()
  @IsString()
  avatar?: string

  /** 0 禁用 1 启用，默认 1 */
  @IsOptional()
  @IsInt()
  status?: number

  /** 角色编码列表，默认 ROLE_USER */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleCodes?: string[]
}
