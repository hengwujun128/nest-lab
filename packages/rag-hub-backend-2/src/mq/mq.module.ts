/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-08-25 13:54:51
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-08-25 18:06:57
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/mq/mq.module.ts
 */
import { Global, Module } from '@nestjs/common'
import { PipelineModule } from '../pipeline/pipeline.module'
import { DocumentPipelineConsumer } from './document-pipeline.consumer'
import { DocumentPipelinePublisher } from './document-pipeline.publisher'
import { RabbitMqService } from './rabbitmq.service'

@Global()
@Module({
  imports: [PipelineModule],
  providers: [RabbitMqService, DocumentPipelinePublisher, DocumentPipelineConsumer],
  // RabbitMqService 仅供本模块内部使用，外部统一走 Publisher 的业务语义方法
  exports: [DocumentPipelinePublisher],
})
export class MqModule {}
