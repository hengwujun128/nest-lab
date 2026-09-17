/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-17 09:09:16
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-17 10:38:14
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/search/search.module.ts
 */
import { Module } from '@nestjs/common'
import { PipelineModule } from '../pipeline/pipeline.module'
import { SearchController } from './search.controller'

@Module({
  imports: [PipelineModule],
  controllers: [SearchController],
})
export class SearchModule {}
