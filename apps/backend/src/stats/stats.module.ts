import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Activity } from "../activity/entities/activity.entity";
import { Order } from "../order/entities/order.entity";
import { Product } from "../product/entities/product.entity";
import { User } from "../user/entities/user.entity";
import { StatsController } from "./stats.controller";
import { StatsService } from "./stats.service";

// 只读聚合模块：跨四张表取数，不落新表、不改既有模块
@Module({
  imports: [TypeOrmModule.forFeature([User, Product, Order, Activity])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
