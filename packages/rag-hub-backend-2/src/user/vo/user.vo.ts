/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-14 11:35:28
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-14 16:14:05
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/user/vo/user.vo.ts
 */
/** 用户对外展示（不含 password） */
export class UserVO {
  id!: string
  username!: string
  email?: string | null
  realName?: string | null
  avatar?: string | null
  status!: number
  lastLoginAt?: Date | null
  createdAt!: Date
  updatedAt!: Date
  roleCodes!: string[]
}
