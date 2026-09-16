/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-15 16:19:17
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-15 17:28:32
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/user/entities/user-permission.entity.ts
 */
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'
import { bigintTransformer } from '../../common/transformers/bigint.transformer'

@Entity('kh_user_permission')
export class UserPermissionEntity {
  @PrimaryColumn({ type: 'bigint', transformer: bigintTransformer })
  id!: string

  @Column({ name: 'user_id', type: 'bigint', transformer: bigintTransformer })
  userId!: string

  @Column({
    name: 'permission_id',
    type: 'bigint',
    transformer: bigintTransformer,
  })
  permissionId!: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
