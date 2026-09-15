/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-09-10 11:39:33
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-15 11:08:03
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/src/auth/auth.module.ts
 */
import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './jwt.strategy'
import { JwtAuthGuard } from './jwt-auth.guard'
import { RolesGuard } from './roles.guard'
import { MailerModule } from '@nestjs-modules/mailer'
import { UserModule } from '../user/user.module'
import { EmailService } from './email.service'
import { EmailActivationService } from './email-activation.service'
import { PasswordResetService } from './password-reset.service'

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    MailerModule,
    // registerAsync 适合从 .env / 环境变量取密钥。
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret-change-me'),
      }),
    }),
    UserModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailService,
    EmailActivationService,
    PasswordResetService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService, UserModule],
})
export class AuthModule {}
