/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-10 11:39:33
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-10 15:07:58
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/auth/decorators/public.decorator.ts
 */
import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'

/** 标记接口无需 JWT（login / register / refresh 等） */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
