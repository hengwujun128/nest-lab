/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-10 11:39:33
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-10 14:43:38
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/auth/auth-user.interface.ts
 */
/** JWT 校验后注入到 Controller 的当前用户 */
export interface AuthUser {
  userId: string
  username: string
  realName?: string | null
  email?: string | null
  avatar?: string | null
  roles: string[]
}
