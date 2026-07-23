/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-07-22 15:50:19
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-07-23 10:54:29
 * @Description:
 * @FilePath: /rag-hub-backend/src/document/document.module.ts
 */
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { DocumentService } from './document.service'
import { DocumentController } from './document.controller'
import { DocumentContent, DocumentContentSchema } from './schemas/document-content.schema'

@Module({
  imports: [MongooseModule.forFeature([{ name: DocumentContent.name, schema: DocumentContentSchema }])],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
