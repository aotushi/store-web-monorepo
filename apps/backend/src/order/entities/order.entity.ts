import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DecimalColumnTransformer } from '../../common/transformers/numeric.transformer';

// 映射既有表 store_order；原表冗余存商品名/商品 id（下单快照语义），关联表 store_order_product 跟随维护
@Entity('store_order')
export class Order {
  @ApiProperty({ description: '订单 id' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '商品名称（下单时快照）' })
  @Column({ length: 50 })
  name: string;

  @ApiProperty({ description: '商品数量' })
  @Column({ default: 1 })
  count: number;

  @ApiProperty({ description: '订单折扣（0.01~1）' })
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 1,
    transformer: new DecimalColumnTransformer(),
  })
  discount: number;

  @ApiProperty({ description: '订单价格（单价 × 数量）' })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  price: number;

  @ApiProperty({ description: '订单折扣价' })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  discountPrice: number;

  @ApiProperty({ description: '订单状态 0 未付款 1 已付款 2 已取消' })
  @Column()
  status: number;

  @ApiProperty({ description: '操作员（下单人用户名）' })
  @Column({ length: 255 })
  operator: string;

  // 联合类型 string | null 反射不出元数据，type 须显式给，否则生成物退化成 object（同 Product.images）
  @ApiProperty({ description: '订单备注', type: String, nullable: true })
  @Column({ type: 'text', nullable: true })
  desc: string | null;

  @ApiProperty({ description: '商品 id' })
  @Column()
  productId: number;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'timestamp', precision: 6 })
  createTime: Date;
}
