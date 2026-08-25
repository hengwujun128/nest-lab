/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-08-20 11:36:50
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-08-20 14:10:20
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-1/src/document/dto/upload-parse.dto.ts
 */
import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional, IsString } from 'class-validator'

/** 上传解析接口的可选表单字段 */
export class UploadParseDto {
  @IsOptional()
  @IsString()
  categoryId?: string

  @IsOptional()
  @IsString()
  teamId?: string

  @IsOptional()
  @IsString()
  authorId?: string

  @IsOptional()
  @IsString()
  tags?: string

  @IsOptional()
  @IsString()
  remark?: string

  @IsOptional()
  @IsString()
  createBy?: string

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === '1') return true
    if (value === false || value === 'false' || value === '0') return false
    return value as boolean
  })
  @IsBoolean()
  isPublic?: boolean
}
