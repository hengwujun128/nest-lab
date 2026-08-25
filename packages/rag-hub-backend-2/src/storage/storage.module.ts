/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-07-24 14:39:00
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-07-27 17:29:05
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-1/src/storage/storage.module.ts
 */
import { Global, Module } from '@nestjs/common'
import { RustfsService } from './rustfs.service'

/*
 *
 *@Global() 用得偏早。
 *目前 RustfsService 只有 parser 一处用到，@Global() 带来的是隐式依赖——别的模块不写 imports 也能注入，日后看代码不知道谁依赖了谁，测试时也更难替换。
 *业界更倾向的做法是显式 imports: [StorageModule]，只有像 Prisma/Logger 这种真正全局单例才加 @Global()。
 *
 * */

@Global()
@Module({
  providers: [RustfsService],
  exports: [RustfsService],
})
export class StorageModule {}
