/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-10 11:39:33
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-14 16:43:37
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/auth/auth.service.ts
 */

import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { AuthUser } from './auth-user.interface'
import { LoginDto, RegisterDto } from './dto/auth.dto'
import { UserService } from '../user/user.service'
import { EmailActivationService } from './email-activation.service'
import { EmailService } from './email.service'

import { ResetPasswordByEmailDto, SendResetCodeDto } from '../user/dto/extra.dto'

import { PasswordResetService, RESET_CODE_COOLDOWN_SECONDS, RESET_CODE_TTL_SECONDS } from './password-reset.service'

export interface LoginResult {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number
  userInfo: AuthUser
}

interface TokenPayload {
  sub: string
  username: string
  type: 'access' | 'refresh'
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailActivation: EmailActivationService,
    private readonly emailService: EmailService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  private accessExpires(): string {
    return this.config.get<string>('JWT_ACCESS_EXPIRES', '2h')
  }

  private refreshExpires(): string {
    return this.config.get<string>('JWT_REFRESH_EXPIRES', '7d')
  }

  private accessExpiresSeconds(): number {
    const raw = this.accessExpires()
    const match = /^(\d+)([smhd])$/.exec(raw)
    if (!match) return 7200
    const n = Number(match[1])
    const unit = match[2]
    if (unit === 's') return n
    if (unit === 'm') return n * 60
    if (unit === 'h') return n * 3600
    return n * 86400
  }

  private requireEmailVerification(): boolean {
    return this.config.get<string>('REQUIRE_EMAIL_VERIFICATION', 'false') === 'true'
  }

  private signAccessToken(user: AuthUser): string {
    const payload: TokenPayload = {
      sub: user.userId,
      username: user.username,
      type: 'access',
    }
    return this.jwtService.sign(payload, {
      expiresIn: this.accessExpires() as `${number}${'s' | 'm' | 'h' | 'd'}`,
    })
  }

  private signRefreshToken(user: AuthUser): string {
    const payload: TokenPayload = {
      sub: user.userId,
      username: user.username,
      type: 'refresh',
    }
    return this.jwtService.sign(payload, {
      expiresIn: this.refreshExpires() as `${number}${'s' | 'm' | 'h' | 'd'}`,
    })
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    // 1. 验证用户名和密码,并返回用户信息
    const user = await this.userService.validateCredentials(dto.username, dto.password)
    // 2. 更新用户最后登录时间
    await this.userService.touchLastLogin(user.userId)
    // 3. 构建登录结果,返回accessToken和refreshToken
    return this.buildLoginResult(user)
  }

  async register(dto: RegisterDto): Promise<{ userId: string; message: string; emailVerificationRequired?: boolean }> {
    const result = await this.userService.register({
      ...dto,
      requireEmailVerification: this.requireEmailVerification(),
    })

    // 如果需要邮箱验证，则发送激活邮件
    if (result.emailVerificationRequired && dto.email) {
      const token = await this.emailActivation.createToken(result.userId)
      try {
        await this.emailService.sendActivationEmail(dto.email, dto.username, token)
      } catch {
        await this.emailActivation.deleteByToken(token)
        throw new BadRequestException('激活邮件发送失败，请稍后再试')
      }
      return {
        userId: result.userId,
        message: '注册成功，请查收邮件激活账户',
        emailVerificationRequired: true,
      }
    }

    return {
      userId: result.userId,
      message: '注册成功，请登录',
    }
  }

  /** 验证邮箱(用户点击邮箱激活链接时调用, 验证token是否有效,并更新用户状态) */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const userId = await this.emailActivation.consumeToken(token)
    if (!userId) {
      throw new BadRequestException('激活链接无效或已过期')
    }
    const message = await this.userService.activateEmail(userId)
    return { message }
  }

  /** 发送重置密码验证码(用户点击重置密码链接时调用) */
  async sendResetCode(dto: SendResetCodeDto): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(dto.email)
    if (!user) {
      throw new NotFoundException('该邮箱未注册')
    }

    // Redis 剩余 TTL：刚发出去时约 600s。剩余 > 540s 说明距上次发送不足 60s，拦截重复发送
    const ttl = await this.passwordReset.getTtl(dto.email)
    if (ttl > RESET_CODE_TTL_SECONDS - RESET_CODE_COOLDOWN_SECONDS) {
      throw new BadRequestException('验证码已发送，请稍后再试')
    }

    const code = String(Math.floor(100000 + Math.random() * 900000))
    await this.passwordReset.set(dto.email, code)
    try {
      await this.emailService.sendResetCodeEmail(dto.email, user.username, code)
    } catch {
      await this.passwordReset.delete(dto.email)
      throw new BadRequestException('邮件发送失败，请稍后再试')
    }
    return { message: '验证码已发送' }
  }

  async resetPasswordByEmail(dto: ResetPasswordByEmailDto): Promise<{ message: string }> {
    if (!(await this.passwordReset.verify(dto.email, dto.code))) {
      throw new BadRequestException('验证码错误或已过期')
    }
    await this.userService.resetPasswordByEmail(dto.email, dto.newPassword)
    await this.passwordReset.delete(dto.email)
    return { message: '密码重置成功，请登录' }
  }

  async refresh(refreshToken: string): Promise<LoginResult> {
    let payload: TokenPayload
    try {
      // 1. 验证refreshToken是否有效
      payload = this.jwtService.verify<TokenPayload>(refreshToken)
    } catch {
      throw new UnauthorizedException('refresh token 无效或已过期')
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('无效的 refresh token')
    }
    // 2. 构建用户信息
    const user = await this.userService.buildAuthUser(payload.sub)
    // 3. 构建登录结果,返回accessToken和refreshToken
    return this.buildLoginResult(user)
  }

  async getMe(userId: string): Promise<AuthUser> {
    return this.userService.buildAuthUser(userId)
  }

  async buildAuthUser(userId: string): Promise<AuthUser> {
    return this.userService.buildAuthUser(userId)
  }

  async getReviewerIds(): Promise<string[]> {
    return this.userService.getUserIdsByRoleCode('ROLE_REVIEWER')
  }

  private buildLoginResult(user: AuthUser): LoginResult {
    return {
      accessToken: this.signAccessToken(user),
      refreshToken: this.signRefreshToken(user),
      tokenType: 'Bearer',
      expiresIn: this.accessExpiresSeconds(),
      userInfo: user,
    }
  }
}
