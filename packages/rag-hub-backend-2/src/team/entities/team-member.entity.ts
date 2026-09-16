/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-15 16:19:17
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-16 15:22:46
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/team/entities/team-member.entity.ts
 */
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'
import { bigintTransformer } from '../../common/transformers/bigint.transformer'

@Entity('kh_team_member')
export class TeamMemberEntity {
  @PrimaryColumn({ type: 'bigint', transformer: bigintTransformer })
  id?: string

  @Column({ name: 'team_id', type: 'bigint', transformer: bigintTransformer })
  teamId?: string

  @Column({ name: 'user_id', type: 'bigint', transformer: bigintTransformer })
  userId?: string

  @Column({ name: 'member_role', type: 'varchar', length: 20, default: 'member' })
  memberRole?: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt?: Date
}
