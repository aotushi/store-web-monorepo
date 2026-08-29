import { ApiProperty } from "@nestjs/swagger";
import { Order } from "../entities/order.entity";

export class OrderListVo {
  @ApiProperty({ description: "当前页数据", type: [Order] })
  list: Order[];

  @ApiProperty({ description: "总条数" })
  total: number;
}
