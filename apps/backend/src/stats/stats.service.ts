import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Activity } from '../activity/entities/activity.entity';
import { Order } from '../order/entities/order.entity';
import { Product } from '../product/entities/product.entity';
import { User } from '../user/entities/user.entity';
import { StatsOverviewVo, StatsTrendPointVo } from './vo/stats-overview.vo';

const ORDER_STATUS = { UNPAID: 0, PAID: 1, CANCELLED: 2 } as const;
const TREND_DAYS = 7;

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Activity) private readonly activityRepo: Repository<Activity>,
  ) {}

  // 日界用 Node 本地时钟（与 deriveStatus / 活动对账 cron 同源）；容器 mysqld 是 UTC，
  // 边界一律在 JS 算好再作为参数下发，不用 SQL 侧 CURDATE()/DATE() 分日
  private localDayStart(offsetDays = 0): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - offsetDays);
    return d;
  }

  private formatDate(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  async overview(): Promise<StatsOverviewVo> {
    const [user, product, productOnSale, order, activity, activityOngoing, unpaid, paid, cancelled] =
      await Promise.all([
        this.userRepo.count(),
        this.productRepo.count(),
        this.productRepo.count({ where: { status: 1 } }),
        this.orderRepo.count(),
        this.activityRepo.count(),
        this.activityRepo.count({ where: { status: 1 } }),
        this.orderRepo.count({ where: { status: ORDER_STATUS.UNPAID } }),
        this.orderRepo.count({ where: { status: ORDER_STATUS.PAID } }),
        this.orderRepo.count({ where: { status: ORDER_STATUS.CANCELLED } }),
      ]);

    // decimal 的 SUM 经驱动回来是字符串（精度语义），Number() 收口
    const totalRaw = await this.orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.discountPrice), 0)', 'total')
      .where('o.status = :paid', { paid: ORDER_STATUS.PAID })
      .getRawOne<{ total: string }>();
    const total = Number(totalRaw?.total ?? 0);

    // 近 7 日（含今天）：SQL 只按窗口起点取行，分桶在 JS 侧完成，缺日补零
    const recent = await this.orderRepo.find({
      where: { createTime: MoreThanOrEqual(this.localDayStart(TREND_DAYS - 1)) },
      select: { createTime: true, status: true, discountPrice: true },
    });

    const buckets = new Map<string, StatsTrendPointVo>();
    for (let i = TREND_DAYS - 1; i >= 0; i--) {
      const date = this.formatDate(this.localDayStart(i));
      buckets.set(date, { date, orderCount: 0, revenue: 0 });
    }
    for (const row of recent) {
      const bucket = buckets.get(this.formatDate(new Date(row.createTime)));
      if (!bucket) continue;
      bucket.orderCount += 1;
      if (row.status === ORDER_STATUS.PAID) bucket.revenue += Number(row.discountPrice);
    }
    const trend = [...buckets.values()];
    // 浮点累加余差收口到分
    for (const p of trend) p.revenue = Math.round(p.revenue * 100) / 100;

    return {
      counts: { user, product, productOnSale, order, activity, activityOngoing },
      orderStatus: { unpaid, paid, cancelled },
      revenue: {
        total: Math.round(total * 100) / 100,
        today: trend[trend.length - 1]?.revenue ?? 0,
      },
      trend,
    };
  }
}
