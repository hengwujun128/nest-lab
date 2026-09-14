/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-10 11:39:33
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-12 19:04:53
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/auth/auth.service.ts
 */

import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { AuthUser } from './auth-user.interface'
import { LoginDto, RegisterDto } from './dto/auth.dto'
import { UserService } from '../user/user.service'

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

  async register(dto: RegisterDto): Promise<{ userId: string; message: string }> {
    const { userId } = await this.userService.register(dto)
    return {
      userId,
      message: '注册成功，请登录',
    }
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
