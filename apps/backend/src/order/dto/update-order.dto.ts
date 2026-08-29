import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt, Min } from "class-validator";

export class UpdateOrderDto {
  @ApiProperty({ description: "订单 id" })
  @IsInt()
  @Min(1)
  id: number;

  @ApiProperty({ description: "目标状态 1 已付款 2 已取消", enum: [1, 2] })
  @IsIn([1, 2], { message: "目标状态只能是 1（已付款）或 2（已取消）" })
  status: number;
}
