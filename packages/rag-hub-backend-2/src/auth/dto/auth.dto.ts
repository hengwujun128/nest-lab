/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-10 11:39:33
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-10 14:42:39
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/auth/dto/auth.dto.ts
 */
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator'

/** 登录 */
export class LoginDto {
  @IsString()
  username!: string

  @IsString()
  password!: string
}

/** 注册（简化：注册后 status=1，立即可登录） */
export class RegisterDto {
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
}

/** 刷新 Token */
export class RefreshTokenDto {
  @IsString()
  refreshToken!: string
}
