import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class EditActivityDto {
  @ApiProperty({ description: '活动 id' })
  @IsInt()
  @Min(1)
  id: number;

  @ApiPropertyOptional({ description: '活动名称' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '活动名称不能为空' })
  @MaxLength(30)
  name?: string;

  @ApiPropertyOptional({ description: '活动类型 0 普通活动 1 拼团活动', enum: [0, 1] })
  @IsOptional()
  @IsIn([0, 1], { message: 'type 只能是 0 或 1' })
  type?: number;

  @ApiPropertyOptional({ description: '活动描述' })
  @IsOptional()
  @IsString()
  desc?: string;

  @ApiPropertyOptional({ description: '活动开始时间（ISO 8601）' })
  @IsOptional()
  @IsDateString({}, { message: '开始时间格式不正确' })
  startTime?: string;

  @ApiPropertyOptional({ description: '活动结束时间（ISO 8601）' })
  @IsOptional()
  @IsDateString({}, { message: '结束时间格式不正确' })
  endTime?: string;

  @ApiPropertyOptional({ description: '参与活动的商品 id' })
  @IsOptional()
  @IsInt()
  @Min(1)
  productId?: number;
}
