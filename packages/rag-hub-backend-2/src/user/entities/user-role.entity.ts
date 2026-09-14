/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-10 11:39:33
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-11 16:05:53
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/user/entities/user-role.entity.ts
 */
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'
import { bigintTransformer } from '../../common/transformers/bigint.transformer'

/** 用户-角色关联（PostgreSQL kh_user_role） */
@Entity('kh_user_role')
export class UserRoleEntity {
  @PrimaryColumn({ type: 'bigint', transformer: bigintTransformer })
  id!: string

  @Column({ name: 'user_id', type: 'bigint', transformer: bigintTransformer })
  userId!: string

  @Column({ name: 'role_id', type: 'bigint', transformer: bigintTransformer })
  roleId!: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
