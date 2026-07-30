import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { EditProductDto } from './dto/edit-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { Product } from './entities/product.entity';
import { ProductService } from './product.service';
import { ProductListVo } from './vo/product-list.vo';

@ApiTags('product')
@ApiBearerAuth()
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post('create')
  @RequirePermission('ProductManage')
  @ApiOperation({ summary: '创建商品' })
  @ApiOkResponse({ type: Product })
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get('list')
  @RequirePermission('ProductList')
  @ApiOperation({ summary: '商品列表（分页 + 名称模糊 + 状态筛选）' })
  @ApiOkResponse({ type: ProductListVo })
  list(@Query() query: ProductQueryDto) {
    return this.productService.findPage(query);
  }

  // 原项目无销量字段，复刻口径：已上架按更新时间倒序前 10
  @Get('hot-list')
  @RequirePermission('HotProductList')
  @ApiOperation({ summary: '热销商品' })
  @ApiOkResponse({ type: [Product] })
  hotList() {
    return this.productService.findHotList();
  }

  @Patch('edit')
  @RequirePermission('ProductManage')
  @ApiOperation({ summary: '编辑商品（上下架走 updateStatus）' })
  @ApiOkResponse({ type: Product })
  edit(@Body() dto: EditProductDto) {
    return this.productService.update(dto);
  }

  @Patch('updateStatus')
  @RequirePermission('updateStatus:product')
  @ApiOperation({ summary: '商品上下架' })
  @ApiOkResponse({ type: Product })
  updateStatus(@Body() dto: UpdateProductStatusDto) {
    return this.productService.updateStatus(dto);
  }

  // 原项目用 GET /product/delete/:id，改为语义化 DELETE（同 user/role 模块决策）
  @Delete(':id')
  @RequirePermission('delete:product')
  @ApiOperation({ summary: '删除商品（被订单/活动引用时拒删）' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productService.remove(id);
  }
}
