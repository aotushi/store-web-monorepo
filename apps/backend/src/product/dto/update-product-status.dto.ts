import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Min } from 'class-validator';

export class UpdateProductStatusDto {
  @ApiProperty({ description: '商品 id' })
  @IsInt()
  @Min(1)
  id: number;

  @ApiProperty({ description: '商品状态 0 未上架 1 已上架 2 已下架', enum: [0, 1, 2] })
  @IsIn([0, 1, 2], { message: 'status 只能是 0/1/2' })
  status: number;
}
