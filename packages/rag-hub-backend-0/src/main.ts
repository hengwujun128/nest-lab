/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-07-23 13:31:18
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-08-19 17:59:38
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-0/src/main.ts
 */
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'

import { GlobalExceptionFilter } from './common/filters/global-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))

  app.useGlobalFilters(new GlobalExceptionFilter())

  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
