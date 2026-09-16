/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-15 16:19:17
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-16 09:03:02
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/common/constants/permissions.ts
 */
import { RoleCode } from './roles'

/** 管理员自动拥有的操作权限 */
export const ADMIN_OPERATION_PERMISSIONS = [
  'document:list',
  'document:create',
  'document:edit',
  'document:delete',
  'document:review',
  'document:category',
  'document:category:query',
  'document:tag',
  'document:version',
  'system:user',
  'system:role',
  'system:permission',
  'system:permission:create',
  'system:permission:edit',
  'system:permission:delete',
  'system:team',
  'system:statistics',
  'system:settings',
] as const

export const ADMIN_ROLES = [RoleCode.ADMIN] as const

/** 1 菜单 2 按钮 3 接口 */
export enum PermissionType {
  Menu = 1,
  Button = 2,
  Api = 3,
}
