/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-17 09:09:16
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-18 10:21:39
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/graph/graph.controller.ts
 */
import { Controller, Get, Query } from '@nestjs/common'
import { GraphBuildService } from '../pipeline/graph-build.service'
import { GraphQueryDto, GraphSearchDto } from './dto/graph-query.dto'

@Controller('graph')
export class GraphController {
  constructor(private readonly graph: GraphBuildService) {}

  /** 按关键词搜 实体 / 文档 / 块节点 */
  @Get('search')
  search(@Query() query: GraphSearchDto) {
    return this.graph.searchGraph(query.keyword, query.limit ?? 50)
  }

  /** 知识实体节点 */
  @Get('nodes')
  listNodes(@Query() query: GraphQueryDto) {
    return this.graph.listNodes(query.type, query.limit ?? 200)
  }

  /** 实体间 RELATED_TO 边 */
  @Get('edges')
  listEdges(@Query() query: GraphQueryDto) {
    return this.graph.listEdges(query.limit ?? 500)
  }
}
