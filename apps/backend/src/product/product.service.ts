import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Like, Repository } from 'typeorm';
import type { CreateProductDto } from './dto/create-product.dto';
import type { EditProductDto } from './dto/edit-product.dto';
import type { ProductQueryDto } from './dto/product-query.dto';
import type { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { Product } from './entities/product.entity';
import type { ProductListVo } from './vo/product-list.vo';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  create(dto: CreateProductDto): Promise<Product> {
    const product = this.productRepo.create({
      name: dto.name,
      desc: dto.desc,
      price: dto.price,
      images: dto.images ?? null,
      status: dto.status ?? 0,
    });
    return this.productRepo.save(product);
  }

  // 分页 + 名称模糊 + 状态筛选
  async findPage(query: ProductQueryDto): Promise<ProductListVo> {
    const [list, total] = await this.productRepo.findAndCount({
      where: {
        ...(query.name ? { name: Like(`%${query.name}%`) } : {}),
        ...(query.status !== undefined ? { status: query.status } : {}),
      },
      order: { createTime: 'DESC' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return { list, total };
  }

  // 热销榜复刻口径：原项目无销量字段，取已上架商品按更新时间倒序前 10
  findHotList(): Promise<Product[]> {
    return this.productRepo.find({
      where: { status: 1 },
      order: { updateTime: 'DESC' },
      take: 10,
    });
  }

  async findById(id: number): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('商品不存在');
    return product;
  }

  async update(dto: EditProductDto): Promise<Product> {
    const product = await this.findById(dto.id);
    if (dto.name !== undefined) product.name = dto.name;
    if (dto.desc !== undefined) product.desc = dto.desc;
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.images !== undefined) product.images = dto.images;
    return this.productRepo.save(product);
  }

  async updateStatus(dto: UpdateProductStatusDto): Promise<Product> {
    const product = await this.findById(dto.id);
    product.status = dto.status;
    return this.productRepo.save(product);
  }

  // 被订单/活动引用的商品拒删（表无外键，一致性由应用层守）；原生 SQL 免得反向依赖 order/activity 模块
  async remove(id: number): Promise<void> {
    await this.findById(id);
    const [[order], [activity]] = await Promise.all([
      this.dataSource.query<{ n: string }[]>(
        'SELECT COUNT(*) n FROM store_order WHERE productId = ?',
        [id],
      ),
      this.dataSource.query<{ n: string }[]>(
        'SELECT COUNT(*) n FROM store_activity WHERE productId = ?',
        [id],
      ),
    ]);
    if (Number(order.n) > 0) throw new BadRequestException('商品已被订单引用，不可删除');
    if (Number(activity.n) > 0) throw new BadRequestException('商品已被活动引用，不可删除');
    await this.productRepo.delete(id);
  }
}
