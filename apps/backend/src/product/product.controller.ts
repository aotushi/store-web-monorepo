import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { EditProductDto } from './dto/edit-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { Product } from './entities/product.entity';
import { ProductImportService } from './product-import.service';
import { ProductService } from './product.service';
import { ImportResultVo } from './vo/import-result.vo';
import { ProductListVo } from './vo/product-list.vo';

@ApiTags('product')
@ApiBearerAuth()
@Controller('product')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly importService: ProductImportService,
  ) {}

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

  // 原表把该接口挂 Home 权限点属种子瑕疵，归位 ProductManage；excel 只解析不留盘（memoryStorage）
  @Post('import')
  @RequirePermission('ProductManage')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiOperation({ summary: 'excel 批量导入商品（表头：商品名称 | 商品描述 | 价格）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiOkResponse({ type: ImportResultVo })
  importProducts(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('缺少上传文件（字段名 file）');
    return this.importService.importFromExcel(file.buffer);
  }

  // 原项目用 GET /product/delete/:id，改为语义化 DELETE（同 user/role 模块决策）
  @Delete(':id')
  @RequirePermission('delete:product')
  @ApiOperation({ summary: '删除商品（被订单/活动引用时拒删）' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productService.remove(id);
  }
}
