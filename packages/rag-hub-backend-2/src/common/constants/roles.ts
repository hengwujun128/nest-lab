/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-10 11:39:33
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-10 14:11:04
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/common/constants/roles.ts
 */
/** 预置角色编码（与 kh_role.role_code 一致） */
export const RoleCode = {
  ADMIN: 'ROLE_ADMIN',
  REVIEWER: 'ROLE_REVIEWER',
  USER: 'ROLE_USER',
} as const

export type RoleCodeValue = (typeof RoleCode)[keyof typeof RoleCode]
