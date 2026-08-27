import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { createWinstonLogger } from './common/logger/winston.logger';
import { buildOpenApiDocument } from './swagger';

async function bootstrap() {
  // 全应用日志统一走 winston：console 可读 + 文件按天轮转（PLAN §6.5）
  const app = await NestFactory.create(AppModule, { logger: createWinstonLogger() });
  const config = app.get(ConfigService);

  app.setGlobalPrefix(config.get<string>('API_PREFIX')!);

  // CORS 白名单 + 暴露 token 响应头（滑动续期新签 token 从响应头下发，PLAN §6.2）
  app.enableCors({
    origin: config.get<string>('CORS_ORIGINS')!.split(','),
    credentials: true,
    exposedHeaders: ['token'],
  });

  // 全局链路（PLAN §6.1）：入参白名单+转换，校验失败产出字段级数组供前端表单回显
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException(
          errors.map((e) => ({ field: e.property, errors: Object.values(e.constraints ?? {}) })),
        ),
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // 文档构建与 export-openapi.ts 同源（src/swagger.ts），运行时文档与导出契约永不漂移
  SwaggerModule.setup('api-docs', app, buildOpenApiDocument(app));

  await app.listen(config.get<number>('APP_PORT')!);
}
void bootstrap();
