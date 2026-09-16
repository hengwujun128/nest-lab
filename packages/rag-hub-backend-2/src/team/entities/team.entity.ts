/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-15 16:19:17
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-16 15:54:12
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/team/entities/team.entity.ts
 */
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'
import { bigintTransformer } from '../../common/transformers/bigint.transformer'

@Entity('kh_team')
export class TeamEntity {
  @PrimaryColumn({ type: 'bigint', transformer: bigintTransformer })
  id!: string

  @Column({ name: 'team_name', type: 'varchar', length: 100 })
  teamName?: string

  @Column({ name: 'team_code', type: 'varchar', length: 50, nullable: true })
  teamCode?: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string | null

  @Column({
    name: 'leader_id',
    type: 'bigint',
    nullable: true,
    transformer: bigintTransformer,
  })
  leaderId?: string | null

  @Column({
    name: 'parent_id',
    type: 'bigint',
    default: '0',
    transformer: bigintTransformer,
  })
  parentId?: string

  @Column({ type: 'int', default: 0 })
  sort?: number

  @Column({ type: 'smallint', default: 1 })
  status?: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt?: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt?: Date

  @Column({ type: 'boolean', default: false })
  deleted?: boolean
}
