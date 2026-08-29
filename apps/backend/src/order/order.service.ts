import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Like, Repository } from "typeorm";
import { ProductService } from "../product/product.service";
import type { CreateOrderDto } from "./dto/create-order.dto";
import type { OrderQueryDto } from "./dto/order-query.dto";
import type { UpdateOrderDto } from "./dto/update-order.dto";
import { Order } from "./entities/order.entity";
import { OrderProduct } from "./entities/order-product.entity";
import type { OrderDetailVo } from "./vo/order-detail.vo";
import type { OrderListVo } from "./vo/order-list.vo";

// 订单状态：0 未付款 1 已付款 2 已取消（终态）
const ORDER_TRANSITIONS: Record<number, number[]> = {
  0: [1, 2],
  1: [2],
  2: [],
};

// 金额乘法走整数分位，避免 IEEE754 浮点误差（0.1 * 3 = 0.30000000000000004）
function moneyMul(a: number, b: number): number {
  return Math.round(a * b * 100) / 100;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    private readonly productService: ProductService,
    private readonly dataSource: DataSource,
  ) {}

  // 下单：冗余字段取商品快照，主表 + 关联表在事务里一起写
  async create(dto: CreateOrderDto, operator: string): Promise<Order> {
    const product = await this.productService.findById(dto.productId);
    if (product.status !== 1) throw new BadRequestException("商品未上架，不可下单");

    const discount = dto.discount ?? 1;
    const price = moneyMul(product.price, dto.count);
    const order = this.orderRepo.create({
      name: product.name,
      count: dto.count,
      discount,
      price,
      discountPrice: moneyMul(price, discount),
      status: 0,
      operator,
      desc: dto.desc ?? null,
      productId: product.id,
    });

    return this.dataSource.transaction(async (em) => {
      const saved = await em.save(order);
      await em.save(em.create(OrderProduct, { orderId: saved.id, productId: product.id }));
      return saved;
    });
  }

  async findPage(query: OrderQueryDto): Promise<OrderListVo> {
    const [list, total] = await this.orderRepo.findAndCount({
      where: {
        ...(query.name ? { name: Like(`%${query.name}%`) } : {}),
        ...(query.status !== undefined ? { status: query.status } : {}),
      },
      order: { createTime: "DESC" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return { list, total };
  }

  async findDetail(id: number): Promise<OrderDetailVo> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException("订单不存在");
    // 商品被订单引用时拒删，正常路径下必存在；防御历史脏数据仍容 null
    const product = await this.productService.findById(order.productId).catch(() => null);
    // 展开 entity 是有意拍平：VO 只要数据形状，原型丢失正是序列化想要的
    // oxlint-disable-next-line typescript/no-misused-spread
    return { ...order, product };
  }

  // 状态流转：付款（0→1）、取消（0→2 / 1→2）；已取消为终态
  async updateOrder(dto: UpdateOrderDto): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id: dto.id } });
    if (!order) throw new NotFoundException("订单不存在");
    if (!ORDER_TRANSITIONS[order.status]?.includes(dto.status)) {
      throw new BadRequestException(`订单状态不可从 ${order.status} 变更为 ${dto.status}`);
    }
    order.status = dto.status;
    return this.orderRepo.save(order);
  }

  // 删除订单：事务清关联表（表无外键，应用层守一致性）
  async remove(id: number): Promise<void> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException("订单不存在");
    await this.dataSource.transaction(async (em) => {
      await em.delete(OrderProduct, { orderId: id });
      await em.delete(Order, id);
    });
  }
}
