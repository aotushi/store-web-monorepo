import { Module } from '@nestjs/common';
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from './activity/activity.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionGuard } from './auth/guards/permission.guard';
import { RequestLogMiddleware } from './common/middleware/request-log.middleware';
import { RedisModule } from './common/redis/redis.module';
import { envValidationSchema } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { OrderModule } from './order/order.module';
import { PermissionModule } from './permission/permission.module';
import { ProductModule } from './product/product.module';
import { RoleModule } from './role/role.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    // 配置中心：进程内唯一 process.env 入口，Joi 白名单 fail-fast（PLAN §6.5）
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        autoLoadEntities: true,
        // 表结构以 sql/ 初始化脚本为准，禁止运行时同步（PLAN §6.4）
        synchronize: false,
        // 配合 compose healthcheck：中间件冷启动时的重连兜底
        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),
    RedisModule,
    HealthModule,
    AuthModule,
    UserModule,
    RoleModule,
    PermissionModule,
    ProductModule,
    OrderModule,
    ActivityModule,
  ],
  providers: [
    // 全局守卫，注册顺序即执行顺序：先认证（默认安全，@Public 豁免），后鉴权（@RequirePermission 声明式）
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 请求摘要日志挂全路由（Express 5 通配符语法 {*splat}，'*' 已废弃）
    consumer.apply(RequestLogMiddleware).forRoutes('{*splat}');
  }
}
