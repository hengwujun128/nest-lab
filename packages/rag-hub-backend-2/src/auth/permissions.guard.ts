/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-15 16:19:17
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-16 15:11:17
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/auth/permissions.guard.ts
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthUser } from './auth-user.interface'
import { PERMISSIONS_KEY } from './decorators/require-permission.decorator'
import { RoleCode } from '../common/constants/roles'

/**
 * 权限码守卫（在 JwtAuthGuard、RolesGuard 之后执行）
 *
 * - 未标 @RequirePermission → 放行
 * - ROLE_ADMIN → 放行
 * - 否则 request.user.permissions 须命中其一
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required?.length) {
      return true
    }

    // user 从 jwt guard 中获取
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>()
    const user = request.user
    if (!user) {
      throw new ForbiddenException('权限不足')
    }
    // 如果用户是管理员，则放行
    if (user.roles.includes(RoleCode.ADMIN)) {
      return true
    }

    const owned = new Set(user.permissions)
    // 判断接口中要求的权限是否在用户拥有的权限中
    const ok = required.some((p) => owned.has(p))
    if (!ok) {
      throw new ForbiddenException('权限不足')
    }
    return true
  }
}
