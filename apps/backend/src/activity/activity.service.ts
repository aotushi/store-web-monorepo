import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { ProductService } from '../product/product.service';
import type { ActivityQueryDto } from './dto/activity-query.dto';
import type { CreateActivityDto } from './dto/create-activity.dto';
import type { EditActivityDto } from './dto/edit-activity.dto';
import { Activity } from './entities/activity.entity';
import type { ActivityListVo } from './vo/activity-list.vo';

// 按时间窗推导活动状态：0 未开始 1 进行中 2 已结束
function deriveStatus(start: Date, end: Date, now = new Date()): number {
  if (now < start) return 0;
  if (now < end) return 1;
  return 2;
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity) private readonly activityRepo: Repository<Activity>,
    private readonly productService: ProductService,
  ) {}

  private validateWindow(start: Date, end: Date): void {
    if (end <= start) throw new BadRequestException('结束时间必须晚于开始时间');
  }

  // 创建：校验时间窗与商品存在性，初始状态按当前时间推导（避免"进行期活动显示未开始"）
  async create(dto: CreateActivityDto): Promise<Activity> {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    this.validateWindow(start, end);
    await this.productService.findById(dto.productId);

    const activity = this.activityRepo.create({
      name: dto.name,
      type: dto.type,
      desc: dto.desc ?? '',
      startTime: start,
      endTime: end,
      productId: dto.productId,
      status: deriveStatus(start, end),
    });
    return this.activityRepo.save(activity);
  }

  async findPage(query: ActivityQueryDto): Promise<ActivityListVo> {
    const [list, total] = await this.activityRepo.findAndCount({
      where: {
        ...(query.name ? { name: Like(`%${query.name}%`) } : {}),
        ...(query.status !== undefined ? { status: query.status } : {}),
      },
      order: { createTime: 'DESC' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return { list, total };
  }

  // 编辑：时间窗变更时整体校验并重推状态
  async update(dto: EditActivityDto): Promise<Activity> {
    const activity = await this.activityRepo.findOne({ where: { id: dto.id } });
    if (!activity) throw new NotFoundException('活动不存在');

    if (dto.name !== undefined) activity.name = dto.name;
    if (dto.type !== undefined) activity.type = dto.type;
    if (dto.desc !== undefined) activity.desc = dto.desc;
    if (dto.productId !== undefined) {
      await this.productService.findById(dto.productId);
      activity.productId = dto.productId;
    }
    if (dto.startTime !== undefined || dto.endTime !== undefined) {
      const start = dto.startTime ? new Date(dto.startTime) : activity.startTime;
      const end = dto.endTime ? new Date(dto.endTime) : activity.endTime;
      this.validateWindow(start, end);
      activity.startTime = start;
      activity.endTime = end;
      activity.status = deriveStatus(start, end);
    }
    return this.activityRepo.save(activity);
  }

  async remove(id: number): Promise<void> {
    const activity = await this.activityRepo.findOne({ where: { id } });
    if (!activity) throw new NotFoundException('活动不存在');
    await this.activityRepo.delete(id);
  }

  // 定时对账（ActivityTasks 消费）：status 是落库快照，时间流逝会漂移（进行中→已结束不会自己变）。
  // now 由应用传参而非 SQL NOW()——容器 mysqld 时区（UTC）与应用/驱动写入时区可能分裂，
  // 传参保证与 create/edit 的 deriveStatus 同一时钟源；WHERE 限定漂移行，affectedRows 即修正数
  async syncStatuses(now: Date): Promise<number> {
    const result: { affectedRows?: number } = await this.activityRepo.query(
      `UPDATE store_activity
       SET status = CASE WHEN ? < startTime THEN 0 WHEN ? >= endTime THEN 2 ELSE 1 END
       WHERE status <> CASE WHEN ? < startTime THEN 0 WHEN ? >= endTime THEN 2 ELSE 1 END`,
      [now, now, now, now],
    );
    return result.affectedRows ?? 0;
  }
}
