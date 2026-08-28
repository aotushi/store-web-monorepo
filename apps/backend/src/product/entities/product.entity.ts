import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DecimalColumnTransformer } from '../../common/transformers/numeric.transformer';

// 映射既有表 store_product（建表见 sql/ 初始化脚本，synchronize:false）
@Entity('store_product')
export class Product {
  @ApiProperty({ description: '商品 id' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '商品名称' })
  @Column({ length: 50 })
  name: string;

  // 联合类型 string | null 反射不出元数据，type 须显式给，否则生成物退化成 object
  @ApiProperty({ description: '商品图片', type: String, nullable: true })
  @Column({ type: 'text', nullable: true })
  images: string | null;

  @ApiProperty({ description: '商品描述' })
  @Column({ type: 'text' })
  desc: string;

  @ApiProperty({ description: '商品状态 0 未上架 1 已上架 2 已下架' })
  @Column({ default: 0 })
  status: number;

  @ApiProperty({ description: '商品价格' })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  price: number;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createTime: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ type: 'datetime', precision: 6 })
  updateTime: Date;
}
