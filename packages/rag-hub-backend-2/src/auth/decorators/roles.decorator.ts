/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-10 11:39:33
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-10 15:08:24
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/auth/decorators/roles.decorator.ts
 */
import { SetMetadata } from '@nestjs/common'
import { RoleCodeValue } from '../../common/constants/roles'

export const ROLES_KEY = 'roles'

/** 要求用户拥有指定角色之一（需配合 RolesGuard） */
export const Roles = (...roles: RoleCodeValue[]) => SetMetadata(ROLES_KEY, roles)
