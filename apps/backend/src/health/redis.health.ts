import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { RedisService } from '../common/redis/redis.service';

// terminus 无内置 redis 探针（官方只给 db/http/microservice），自定义 indicator 走 PING
@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly indicatorService: HealthIndicatorService,
    private readonly redis: RedisService,
  ) {}

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.indicatorService.check(key);
    try {
      await this.redis.ping();
      return indicator.up();
    } catch {
      return indicator.down({ message: 'redis 连接不可用' });
    }
  }
}
