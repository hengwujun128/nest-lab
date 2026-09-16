/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-14 11:35:28
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-16 14:40:07
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/user/user.controller.ts
 */
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { UserService } from './user.service'
import { QueryUserDto } from './dto/query-user.dto'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { AssignRolesDto } from './dto/assign-roles.dto'
import { UpdateProfileDto } from './dto/profile.dto'
import { ChangePasswordDto, ResetPasswordDto } from './dto/password.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { RoleCode } from '../common/constants/roles'
import type { AuthUser } from '../auth/auth-user.interface'

import { RequirePermission } from '../auth/decorators/require-permission.decorator'
import { AssignPermissionIdsDto } from './dto/permission.dto'
import { PermissionService } from './permission.service'

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly permissionService: PermissionService,
  ) {}

  /** 当前用户: 更新个人信息 */
  @Put('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(user.userId, dto)
  }

  /** 当前用户: 获取统计信息 */
  @Get('me/stats')
  getMyStats(@CurrentUser() user: AuthUser) {
    return this.userService.getUserStatistics(user.userId)
  }

  /** 当前用户: 修改密码 */
  @Put('password/change')
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    await this.userService.changePassword(user.userId, dto.oldPassword, dto.newPassword)
    return { message: '密码修改成功' }
  }

  /** 管理员: 分页获取用户列表 */
  @Get('page')
  @Roles(RoleCode.ADMIN)
  pageUsers(@Query() query: QueryUserDto) {
    return this.userService.pageUsers(query)
  }

  /** 管理员: 获取用户详情 */
  @Get(':id')
  @Roles(RoleCode.ADMIN)
  getUser(@Param('id') id: string) {
    return this.userService.getUserVO(id)
  }

  /** 管理员: 创建用户 */
  @Post()
  @Roles(RoleCode.ADMIN)
  async createUser(@Body() dto: CreateUserDto) {
    const userId = await this.userService.createUser(dto)
    return this.userService.getUserVO(userId)
  }

  /** 管理员: 更新用户信息 */
  @Put(':id')
  @Roles(RoleCode.ADMIN)
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(id, dto)
  }

  /** 删除用户 */
  @Delete(':id')
  @Roles(RoleCode.ADMIN)
  async deleteUser(@Param('id') id: string) {
    await this.userService.deleteUser(id)
    return { message: '删除成功' }
  }

  /** 管理员: 给用户重置密码 */
  @Put(':id/password/reset')
  @Roles(RoleCode.ADMIN)
  async resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    await this.userService.resetPassword(id, dto.newPassword)
    return { message: '密码重置成功' }
  }

  /** 管理员: 获取用户角色 */
  @Get(':id/roles')
  @Roles(RoleCode.ADMIN)
  async getUserRoles(@Param('id') id: string) {
    const roleCodes = await this.userService.getUserRoleCodes(id)
    return { userId: id, roleCodes }
  }

  /** 管理员: 分配用户角色 */
  @Put(':id/roles')
  @Roles(RoleCode.ADMIN)
  async assignRoles(@Param('id') id: string, @Body() dto: AssignRolesDto) {
    const roleCodes = await this.userService.replaceRoles(id, dto.roleCodes)
    return { userId: id, roleCodes }
  }

  /** 获取用户权限(包括权限ids,权限codes) */
  @Get(':id/permissions')
  @Roles(RoleCode.ADMIN)
  @RequirePermission('system:user')
  async getUserPermissions(@Param('id') id: string) {
    await this.userService.findByIdOrThrow(id)
    // (用户权限, 角色权限, 管理员权限)合并后的权限codes
    const permissionCodes = await this.permissionService.getUserPermissionCodes(id)
    // 获取用户直接权限ids
    const permissionIds = await this.permissionService.getUserDirectPermissionIds(id)
    return { userId: id, permissionCodes, directPermissionIds: permissionIds }
  }
  /** 分配用户权限 */
  @Put(':id/permissions')
  @Roles(RoleCode.ADMIN)
  @RequirePermission('system:user')
  async assignUserPermissions(@Param('id') id: string, @Body() dto: AssignPermissionIdsDto) {
    await this.userService.findByIdOrThrow(id)
    const permissionIds = await this.permissionService.assignUserPermissions(id, dto)
    return { userId: id, permissionIds }
  }
}
