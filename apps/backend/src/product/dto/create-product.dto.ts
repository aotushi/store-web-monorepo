import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ description: '商品名称', example: '烧鹅' })
  @IsString()
  @IsNotEmpty({ message: '商品名称不能为空' })
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: '商品描述', example: '今日现烧' })
  @IsString()
  @IsNotEmpty({ message: '商品描述不能为空' })
  desc: string;

  @ApiProperty({ description: '商品价格', example: 38.5 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: '价格最多两位小数' })
  @Min(0.01, { message: '价格必须大于 0' })
  price: number;

  @ApiPropertyOptional({ description: '商品图片' })
  @IsOptional()
  @IsString()
  images?: string;

  @ApiPropertyOptional({ description: '商品状态 0 未上架 1 已上架 2 已下架', enum: [0, 1, 2] })
  @IsOptional()
  @IsIn([0, 1, 2], { message: 'status 只能是 0/1/2' })
  status?: number;
}
