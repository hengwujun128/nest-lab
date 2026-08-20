/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-07-23 13:31:18
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-08-20 11:16:04
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-0/src/app.service.ts
 */
import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!'
  }
}
