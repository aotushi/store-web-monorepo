import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Controller,
  Post,
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
import { diskStorage } from 'multer';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { IMAGE_EXT, UPLOAD_DIR } from './upload.constants';
import { UploadResultVo } from './vo/upload-result.vo';

@ApiTags('upload')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  // 上传目前只服务商品图，权限跟随商品管理
  @Post('image')
  @RequirePermission('ProductManage')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        // 文件名随机化：原始名只用于展示，落盘名与扩展全部服务端生成
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${IMAGE_EXT[file.mimetype]}`),
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!IMAGE_EXT[file.mimetype]) {
          return cb(new BadRequestException('仅支持 jpg/png/webp/gif 图片'), false);
        }
        cb(null, true);
      },
    }),
  )
  @ApiOperation({ summary: '上传商品图片（≤2MB）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiOkResponse({ type: UploadResultVo })
  uploadImage(@UploadedFile() file: Express.Multer.File): UploadResultVo {
    if (!file) throw new BadRequestException('缺少上传文件（字段名 file）');
    // /uploads 由 serve-static 在 middleware 层暴露：不走 api 前缀，也不过全局守卫（商品图需公开可见）
    return { url: `/uploads/${file.filename}`, size: file.size };
  }
}
