/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-14 11:35:28
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-15 10:05:46
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/user/dto/extra.dto.ts
 */
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator'

export class SendResetCodeDto {
  @IsEmail()
  email!: string
}

export class ResetPasswordByEmailDto {
  @IsEmail()
  email!: string

  @IsString()
  code!: string

  @IsString()
  @MinLength(6)
  newPassword!: string
}

export class CreateRoleDto {
  @IsString()
  roleName!: string

  @IsString()
  roleCode!: string

  @IsOptional()
  @IsString()
  description?: string
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  roleName!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  status?: number
}
