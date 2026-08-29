import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { JwtPayload } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CreateOrderDto } from "./dto/create-order.dto";
import { OrderQueryDto } from "./dto/order-query.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { Order } from "./entities/order.entity";
import { OrderService } from "./order.service";
import { OrderDetailVo } from "./vo/order-detail.vo";
import { OrderListVo } from "./vo/order-list.vo";

@ApiTags("order")
@ApiBearerAuth()
@Controller("order")
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post("create")
  @RequirePermission("OrderManage")
  @ApiOperation({ summary: "下单（商品须已上架；金额按商品价快照计算）" })
  @ApiOkResponse({ type: Order })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: JwtPayload) {
    return this.orderService.create(dto, user.username);
  }

  @Get("list")
  @RequirePermission("OrderManage")
  @ApiOperation({ summary: "订单列表（分页 + 商品名模糊 + 状态筛选）" })
  @ApiOkResponse({ type: OrderListVo })
  list(@Query() query: OrderQueryDto) {
    return this.orderService.findPage(query);
  }

  @Get("detail/:id")
  @RequirePermission("OrderManage")
  @ApiOperation({ summary: "订单详情（含关联商品）" })
  @ApiOkResponse({ type: OrderDetailVo })
  detail(@Param("id", ParseIntPipe) id: number) {
    return this.orderService.findDetail(id);
  }

  // 原接口名 updateOrder 保留；权限码沿用原表的 cancel:order（状态流转含付款与取消）
  @Patch("updateOrder")
  @RequirePermission("cancel:order")
  @ApiOperation({ summary: "订单状态流转（0→1 付款，0/1→2 取消，已取消为终态）" })
  @ApiOkResponse({ type: Order })
  updateOrder(@Body() dto: UpdateOrderDto) {
    return this.orderService.updateOrder(dto);
  }

  // 原项目用 GET /order/delete/:id，改为语义化 DELETE（同 user/role 模块决策）
  @Delete(":id")
  @RequirePermission("delete:order")
  @ApiOperation({ summary: "删除订单（事务清关联表）" })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.orderService.remove(id);
  }
}
