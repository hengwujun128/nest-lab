/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-17 09:09:16
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-18 10:21:33
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/graph/graph.module.ts
 */
import { Module } from '@nestjs/common'
import { PipelineModule } from '../pipeline/pipeline.module'
import { GraphController } from './graph.controller'

@Module({
  imports: [PipelineModule],
  controllers: [GraphController],
})
export class GraphModule {}
