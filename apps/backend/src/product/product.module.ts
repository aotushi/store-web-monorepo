import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "./entities/product.entity";
import { ProductController } from "./product.controller";
import { ProductImportService } from "./product-import.service";
import { ProductService } from "./product.service";

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [ProductController],
  providers: [ProductService, ProductImportService],
  // Order/Activity 创建时校验商品存在性
  exports: [ProductService],
})
export class ProductModule {}
