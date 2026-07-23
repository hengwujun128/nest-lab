/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-07-22 15:50:19
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-07-23 10:45:13
 * @Description:
 * @FilePath: /rag-hub-backend/src/document/dto/update-document.dto.ts
 */
import { PartialType, OmitType } from '@nestjs/mapped-types'
import { IsOptional, IsString } from 'class-validator'
import { CreateDocumentDto } from './create-document.dto'

/** 更新文档（字段均可选） */
export class UpdateDocumentDto extends PartialType(OmitType(CreateDocumentDto, ['createBy'] as const)) {
  /** 更新人 ID */
  @IsOptional()
  @IsString()
  updateBy?: string
}
