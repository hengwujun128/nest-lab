/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-15 16:19:17
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-16 15:20:47
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/team/team.module.ts
 */
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TeamEntity } from './entities/team.entity'
import { TeamMemberEntity } from './entities/team-member.entity'
import { UserEntity } from '../user/entities/user.entity'
import { TeamService } from './team.service'
import { TeamController } from './team.controller'

@Module({
  imports: [TypeOrmModule.forFeature([TeamEntity, TeamMemberEntity, UserEntity])],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}
