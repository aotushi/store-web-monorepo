import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';

// 文档构建唯一出口：main.ts（运行时 /api-docs）与 export-openapi.ts（导出 openapi.json 给 orval）
// 共用，保证两边永不漂移。swagger 保持裸类型，响应壳由前端 orval mutator 统一剥（PLAN §7#11）
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('store-web API')
    .setDescription('数字门店系统后端接口')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config);
}
