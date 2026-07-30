import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ description: '商品 id' })
  @IsInt()
  @Min(1)
  productId: number;

  @ApiProperty({ description: '商品数量', example: 2 })
  @IsInt({ message: '数量必须是整数' })
  @Min(1, { message: '数量至少为 1' })
  count: number;

  @ApiPropertyOptional({ description: '订单折扣（0.01~1，默认不打折）', example: 0.88 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: '折扣最多两位小数' })
  @Min(0.01, { message: '折扣最低 0.01' })
  @Max(1, { message: '折扣不能超过 1' })
  discount?: number;

  @ApiPropertyOptional({ description: '订单备注' })
  @IsOptional()
  @IsString()
  desc?: string;
}
