import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { REDIS_CLIENT } from "./redis.constants";
import { RedisService } from "./redis.service";

// 全局横切基座：验证码 TTL、业务缓存共用一个连接（PLAN §6.5 redis 用途清单）
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis({
          host: config.get<string>("REDIS_HOST"),
          port: config.get<number>("REDIS_PORT"),
          // 所有 key 统一业务前缀，与共库应用隔离；keys/scan 的 pattern 参数不受前缀管辖，业务禁用
          keyPrefix: config.get<string>("REDIS_KEY_PREFIX"),
        }),
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
