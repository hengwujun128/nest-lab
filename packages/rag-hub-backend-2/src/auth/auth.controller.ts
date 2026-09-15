/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-10 11:39:33
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-14 15:30:56
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/auth/auth.controller.ts
 */
import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto'
import { Public } from './decorators/public.decorator'
import { CurrentUser } from './decorators/current-user.decorator'
import type { AuthUser } from './auth-user.interface'
import { Roles } from './decorators/roles.decorator'
import { RoleCode } from '../common/constants/roles'
import { SendResetCodeDto } from './dto/send-reset-code.dto'
import { ResetPasswordByEmailDto } from './dto/reset-password-by-email.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken)
  }

  @Public()
  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token)
  }

  @Public()
  @Post('password/reset/send-code')
  sendResetCode(@Body() dto: SendResetCodeDto) {
    return this.authService.sendResetCode(dto)
  }

  @Public()
  @Post('password/reset')
  resetPassword(@Body() dto: ResetPasswordByEmailDto) {
    return this.authService.resetPasswordByEmail(dto)
  }

  /** 无状态 JWT：客户端丢弃 token 即可 */
  @Post('logout')
  logout() {
    return { message: '已退出登录' }
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user.userId)
  }

  /*
   * 获取所有审核员列表
   * @returns
   * @memberOf AuthController
   * */
  @Get('reviewer-ids')
  @Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
  getReviewerIds() {
    return this.authService.getReviewerIds()
  }
}
