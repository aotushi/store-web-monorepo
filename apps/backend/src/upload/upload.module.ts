import { mkdirSync } from 'node:fs';
import { Module, OnModuleInit } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UPLOAD_DIR } from './upload.constants';

@Module({
  controllers: [UploadController],
})
export class UploadModule implements OnModuleInit {
  onModuleInit() {
    // multer diskStorage 不自建目录，冷启动兜底
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}
