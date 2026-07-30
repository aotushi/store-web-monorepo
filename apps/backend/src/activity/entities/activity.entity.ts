import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// 映射既有表 store_activity
@Entity('store_activity')
export class Activity {
  @ApiProperty({ description: '活动 id' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '活动名称' })
  @Column({ length: 30 })
  name: string;

  @ApiProperty({ description: '活动状态 0 未开始 1 进行中 2 已结束' })
  @Column({ default: 0 })
  status: number;

  @ApiProperty({ description: '活动类型 0 普通活动 1 拼团活动' })
  @Column()
  type: number;

  @ApiProperty({ description: '活动描述' })
  @Column({ type: 'text' })
  desc: string;

  @ApiProperty({ description: '活动开始时间' })
  @Column({ type: 'timestamp' })
  startTime: Date;

  @ApiProperty({ description: '活动结束时间' })
  @Column({ type: 'timestamp' })
  endTime: Date;

  @ApiProperty({ description: '参与活动的商品 id' })
  @Column()
  productId: number;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'timestamp', precision: 6 })
  createTime: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ type: 'timestamp', precision: 6 })
  updateTime: Date;
}
