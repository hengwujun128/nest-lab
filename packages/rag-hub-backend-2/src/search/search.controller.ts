/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-17 09:09:16
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-17 10:46:29
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/search/search.controller.ts
 */
import { Body, Controller, Post } from '@nestjs/common'
import { SearchIndexService } from '../pipeline/search-index.service'
import { SearchDocumentsDto } from './dto/search.dto'
import { RequirePermission } from '../auth/decorators/require-permission.decorator'
import { PermissionCode } from '../common/constants/permissions'

@Controller('search')
export class SearchController {
  constructor(private readonly searchIndex: SearchIndexService) {}

  /** 关键词检索,通过前端传入的关键词检索, 以及分页, 分类, 作者等条件检索; 已发布文档（ES kh_document） */
  @Post()
  @RequirePermission(PermissionCode.search)
  search(@Body() dto: SearchDocumentsDto) {
    return this.searchIndex.searchDocuments({
      keyword: dto.keyword, // 关键词
      page: dto.page, // 分页
      pageSize: dto.pageSize, // 每页条数
      categoryId: dto.categoryId, // 分类
      authorId: dto.authorId, // 作者
    })
  }
}
