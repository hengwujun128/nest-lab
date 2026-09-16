/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-15 16:19:17
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-16 17:14:26
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/team/team.controller.ts
 */
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { TeamService } from './team.service'
import { CreateTeamDto, QueryTeamDto, UpdateTeamDto } from './dto/team.dto'
import { RequirePermission } from '../auth/decorators/require-permission.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { RoleCode } from '../common/constants/roles'

@Controller('teams')
@Roles(RoleCode.ADMIN)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  @RequirePermission('system:team')
  create(@Body() dto: CreateTeamDto) {
    return this.teamService.create(dto)
  }

  @Put(':id')
  @RequirePermission('system:team')
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamService.update(id, dto)
  }

  @Delete(':id')
  @RequirePermission('system:team')
  async delete(@Param('id') id: string) {
    await this.teamService.delete(id)
    return { message: '删除成功' }
  }

  @Get('page')
  @RequirePermission('system:team')
  page(@Query() query: QueryTeamDto) {
    return this.teamService.page(query)
  }

  @Get('tree')
  getTree(@Query('rootOnly') rootOnly?: string) {
    return this.teamService.getTree(rootOnly === 'true')
  }

  @Get(':id')
  @RequirePermission('system:team')
  getDetail(@Param('id') id: string) {
    return this.teamService.getDetail(id)
  }

  @Post(':id/members')
  @RequirePermission('system:team')
  addMembers(@Param('id') id: string, @Body() userIds: string[]) {
    return this.teamService.addMembers(id, userIds)
  }

  @Delete(':id/members')
  @RequirePermission('system:team')
  removeMembers(@Param('id') id: string, @Body() userIds: string[]) {
    return this.teamService.removeMembers(id, userIds)
  }

  @Get(':id/members')
  @RequirePermission('system:team')
  listMembers(@Param('id') id: string) {
    return this.teamService.listMembers(id)
  }
}
