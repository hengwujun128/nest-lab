/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-10-10 16:44:29
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-10-10 17:08:42
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/ai/entities/ai-session.entity.ts
 */
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'
import { bigintTransformer } from '../../common/transformers/bigint.transformer'

/** AI 会话（PostgreSQL kh_ai_session） */
@Entity('kh_ai_session')
export class AiSessionEntity {
  @PrimaryColumn({ type: 'bigint', transformer: bigintTransformer })
  id!: string

  @Column({
    name: 'user_id',
    type: 'bigint',
    transformer: bigintTransformer,
  })
  userId!: string

  @Column({ type: 'varchar', length: 80 })
  title!: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date
}
