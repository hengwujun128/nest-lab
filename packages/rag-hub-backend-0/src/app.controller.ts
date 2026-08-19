/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-07-23 13:31:18
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-08-03 15:16:35
 * @Description:
 * @FilePath: /rag-hub-backend/packages/rag-hub-backend-0/src/app.controller.ts
 */
import { Controller, Get } from '@nestjs/common'
import { AppService } from './app.service'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }
}
