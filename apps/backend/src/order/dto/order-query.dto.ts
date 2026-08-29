import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class OrderQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "商品名称模糊搜索" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: "订单状态筛选 0 未付款 1 已付款 2 已取消", enum: [0, 1, 2] })
  @Type(() => Number)
  @IsIn([0, 1, 2], { message: "status 只能是 0/1/2" })
  @IsOptional()
  status?: number;
}
