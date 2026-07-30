import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../entities/product.entity';

export class ProductListVo {
  @ApiProperty({ description: '当前页数据', type: [Product] })
  list: Product[];

  @ApiProperty({ description: '总条数' })
  total: number;
}
