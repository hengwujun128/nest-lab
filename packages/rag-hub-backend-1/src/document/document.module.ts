/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-07-22 15:50:19
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-08-20 13:50:25
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-1/src/document/document.module.ts
 */
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { DocumentService } from './document.service'
import { DocumentController } from './document.controller'
import { DocumentContent, DocumentContentSchema } from './schemas/document-content.schema'
import { FileParserService } from './parser/file-parser.service'

@Module({
  imports: [MongooseModule.forFeature([{ name: DocumentContent.name, schema: DocumentContentSchema }])],
  controllers: [DocumentController],
  providers: [DocumentService, FileParserService],
  exports: [DocumentService, FileParserService],
})
export class DocumentModule {}
