/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-07-21 16:44:36
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-16 15:52:39
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/app.module.ts
 */
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MongooseModule } from '@nestjs/mongoose'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DocumentModule } from './document/document.module'
import { DocumentEntity } from './document/entities/document.entity'
import { DocumentReviewEntity } from './document/entities/document-review.entity'
import { UserEntity } from './user/entities/user.entity'
import { RoleEntity } from './user/entities/role.entity'
import { UserRoleEntity } from './user/entities/user-role.entity'
import { PermissionEntity } from './user/entities/permission.entity'
import { RolePermissionEntity } from './user/entities/role-permission.entity'
import { UserPermissionEntity } from './user/entities/user-permission.entity'
import { TeamEntity } from './team/entities/team.entity'
import { TeamMemberEntity } from './team/entities/team-member.entity'

import { StorageModule } from './storage/storage.module'
import { PipelineModule } from './pipeline/pipeline.module'
import { MqModule } from './mq/mq.module'
import { AuthModule } from './auth/auth.module'

/* ----------------------------------- V8 ----------------------------------- */
import { RedisModule } from './redis/redis.module'
import { MailerModule } from '@nestjs-modules/mailer'
/* ----------------------------------- v9 ----------------------------------- */
import { TeamModule } from './team/team.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('MAIL_HOST', 'smtp.example.com'),
          port: config.get<number>('MAIL_PORT', 587),
          secure: config.get<string>('MAIL_SECURE') === 'true',

          auth: {
            user: config.get<string>('MAIL_USER', 'your-email@example.com'),

            // 优先 MAIL_PASS（.env 常用），兼容 MAIL_PASSWORD
            pass: config.get<string>('MAIL_PASS') ?? config.get<string>('MAIL_PASSWORD', 'your-password'),
          },
        },
        defaults: {
          from: config.get<string>('MAIL_FROM'),
        },
      }),
    }),
    PipelineModule,
    StorageModule,
    MqModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('POSTGRES_HOST', 'localhost'),
        port: config.get<number>('POSTGRES_PORT', 5432),
        username: config.get<string>('POSTGRES_USER', 'user'),
        password: config.get<string>('POSTGRES_PASSWORD', '123456'),
        database: config.get<string>('POSTGRES_DB', 'knowledge_hub'),
        entities: [
          DocumentEntity,
          DocumentReviewEntity,
          UserEntity,
          RoleEntity,
          UserRoleEntity,
          PermissionEntity,
          RolePermissionEntity,
          UserPermissionEntity,
          TeamEntity,
          TeamMemberEntity,
        ],
        synchronize: false, // 继续关着，别靠 sync 建表
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>(
          'MONGO_URI',
          'mongodb://mongo_user:mongo_pass123@localhost:27017/knowledge_hub?authSource=admin',
        ),
      }),
    }),
    DocumentModule,
    AuthModule,
    TeamModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
