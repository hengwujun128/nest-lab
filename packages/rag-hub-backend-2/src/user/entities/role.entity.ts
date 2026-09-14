/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-10 11:39:33
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-11 16:05:44
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/user/entities/role.entity.ts
 */
import { Column, Entity, PrimaryColumn } from 'typeorm'
import { bigintTransformer } from '../../common/transformers/bigint.transformer'

/** 角色（PostgreSQL kh_role） */
@Entity('kh_role')
export class RoleEntity {
  @PrimaryColumn({ type: 'bigint', transformer: bigintTransformer })
  id!: string

  @Column({ name: 'role_name', type: 'varchar', length: 50 })
  roleName!: string

  @Column({ name: 'role_code', type: 'varchar', length: 50, unique: true })
  roleCode!: string

  @Column({ type: 'varchar', length: 200, nullable: true })
  description?: string | null

  @Column({ type: 'smallint', default: 1 })
  status!: number
}
