/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-08 16:05:25
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-11 17:15:43
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/document/dto/review.dto.ts
 */
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

/** 审核任务列表查询（审核员工作台） */
export class QueryReviewTasksDto {
  /** 筛选：pending 待办 | approved 已通过 | rejected 已驳回；不传则返回全部 */
  @IsOptional()
  @IsString()
  status?: 'pending' | 'approved' | 'rejected'

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20
}

/**
 * 审核通过 / 驳回请求体
 * 审核通过 / 驳回请求体（审核人信息从 JWT 取，不在 body 传）
 */
export class ReviewDecisionDto {
  /** 审核意见（驳回时必填） */
  @IsOptional()
  @IsString()
  reviewComment?: string
}
