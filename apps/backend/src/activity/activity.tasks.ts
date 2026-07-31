import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ActivityService } from './activity.service';

// 活动状态每分钟对账一次：只修正漂移行，无漂移时零写入零日志
@Injectable()
export class ActivityTasks {
  private readonly logger = new Logger(ActivityTasks.name);

  constructor(private readonly activityService: ActivityService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async syncActivityStatuses() {
    const fixed = await this.activityService.syncStatuses(new Date());
    if (fixed > 0) this.logger.log(`活动状态对账：修正 ${fixed} 条漂移`);
  }
}
