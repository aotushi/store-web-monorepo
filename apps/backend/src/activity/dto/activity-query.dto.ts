import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ActivityQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: '活动名称模糊搜索' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '活动状态筛选 0 未开始 1 进行中 2 已结束', enum: [0, 1, 2] })
  @Type(() => Number)
  @IsIn([0, 1, 2], { message: 'status 只能是 0/1/2' })
  @IsOptional()
  status?: number;
}
