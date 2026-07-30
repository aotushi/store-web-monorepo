import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// 映射既有表 store_order_product（订单-商品关联；当前单商品订单形态下与主表 productId 冗余，为兼容原表结构保留维护）
@Entity('store_order_product')
export class OrderProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productId: number;

  @Column()
  orderId: number;
}
