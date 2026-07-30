import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../../product/entities/product.entity';
import { Order } from '../entities/order.entity';

export class OrderDetailVo extends Order {
  @ApiProperty({ description: '关联商品（已删除时为 null）', type: Product, nullable: true })
  product: Product | null;
}
