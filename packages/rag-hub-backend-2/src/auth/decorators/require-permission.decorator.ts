/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-15 16:19:17
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-15 17:39:28
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/auth/decorators/require-permission.decorator.ts
 */
import { SetMetadata } from '@nestjs/common'

export const PERMISSIONS_KEY = 'permissions'

/** 要求用户拥有指定权限码之一（需配合 PermissionsGuard；ROLE_ADMIN 自动放行） */
export const RequirePermission = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions)
