/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-17 09:09:16
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-10-28 14:04:07
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/graph/graph.controller.ts
 */
import { Controller, Get, Query } from '@nestjs/common'
import { GraphBuildService } from '../pipeline/graph-build.service'
import { GraphQueryDto, GraphSearchDto, GraphOverviewDto } from './dto/graph-query.dto'

import { RequirePermission } from '../auth/decorators/require-permission.decorator'
import { PermissionCode } from '../common/constants/permissions'

import { accessFromUser } from '../document/document-access'
import { CurrentUser } from 'src/auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/auth-user.interface'

@Controller('graph')
@RequirePermission(PermissionCode.search)
export class GraphController {
  constructor(private readonly graph: GraphBuildService) {}

  /** 全景：文档 / 实体 / 标签 + 统计，供前端力导向图 */
  @Get('overview')
  overview(@Query() query: GraphOverviewDto, @CurrentUser() user: AuthUser) {
    return this.graph.getOverview({
      keyword: query.keyword,
      entityType: query.entityType,
      from: query.from,
      to: query.to,
      docLimit: query.docLimit,
      scope: accessFromUser(user),
    })
  }
  /** 按关键词搜 实体 / 文档 / 块节点 */
  @Get('search')
  search(@Query() query: GraphSearchDto, @CurrentUser() user: AuthUser) {
    return this.graph.searchGraph(query.keyword, query.limit ?? 50, accessFromUser(user))
  }

  /** 知识实体节点 */
  @Get('nodes')
  listNodes(@Query() query: GraphQueryDto, @CurrentUser() user: AuthUser) {
    return this.graph.listNodes(query.type, query.limit ?? 200, accessFromUser(user))
  }

  /** 实体间 RELATED_TO 边 */
  @Get('edges')
  listEdges(@Query() query: GraphQueryDto, @CurrentUser() user: AuthUser) {
    return this.graph.listEdges(query.limit ?? 500, accessFromUser(user))
  }
}
