/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-14 11:35:28
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-16 14:13:25
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/user/role.controller.ts
 */
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { RoleService } from './role.service'
import { CreateRoleDto, UpdateRoleDto } from './dto/extra.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { RoleCode } from '../common/constants/roles'
import { PermissionService } from './permission.service'

import { RequirePermission } from '../auth/decorators/require-permission.decorator'
import { AssignPermissionIdsDto } from './dto/permission.dto'

/** 角色管理 :只有管理员可以访问 */
@Controller('roles')
@Roles(RoleCode.ADMIN)
export class RoleController {
  constructor(
    private readonly roleService: RoleService,
    private readonly permissionService: PermissionService,
  ) {}

  @Get('list')
  async listRoles() {
    const roles = await this.roleService.listAll()
    return roles.map((r) => ({
      id: r.id,
      roleName: r.roleName,
      roleCode: r.roleCode,
      description: r.description,
    }))
  }

  @Get(':id')
  async getRole(@Param('id') id: string) {
    const role = await this.roleService.getById(id)
    return {
      id: role.id,
      roleName: role.roleName,
      roleCode: role.roleCode,
      description: role.description,
      status: role.status,
    }
  }

  @Post()
  async createRole(@Body() dto: CreateRoleDto) {
    const role = await this.roleService.create(dto)
    return {
      id: role.id,
      roleName: role.roleName,
      roleCode: role.roleCode,
      description: role.description,
    }
  }

  @Put(':id')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    const role = await this.roleService.update(id, dto)
    return {
      id: role.id,
      roleName: role.roleName,
      roleCode: role.roleCode,
      description: role.description,
      status: role.status,
    }
  }

  @Delete(':id')
  async deleteRole(@Param('id') id: string) {
    await this.roleService.delete(id)
    return { message: '删除成功' }
  }

  @Get(':id/permissions')
  @RequirePermission('system:role')
  async getRolePermissions(@Param('id') id: string) {
    const permissionIds = await this.permissionService.getRolePermissionIds(id)
    return { roleId: id, permissionIds }
  }

  /** 分配角色权限 */
  @Put(':id/permissions')
  @RequirePermission('system:role')
  async assignRolePermissions(@Param('id') id: string, @Body() dto: AssignPermissionIdsDto) {
    const permissionIds = await this.permissionService.assignRolePermissions(id, dto)
    return { roleId: id, permissionIds }
  }
}
