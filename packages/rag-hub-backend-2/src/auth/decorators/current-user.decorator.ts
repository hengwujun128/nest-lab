/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-10 11:39:33
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-10 15:01:25
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/auth/decorators/current-user.decorator.ts
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { AuthUser } from '../auth-user.interface'

/** 从 request.user 取当前登录用户（需 JwtAuthGuard） */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>()
  return request.user
})
