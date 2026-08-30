import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { createWinstonLogger } from "./common/logger/winston.logger";
import { setupApp } from "./setup-app";
import { buildOpenApiDocument } from "./swagger";

async function bootstrap() {
  // 全应用日志统一走 winston：console 可读 + 文件按天轮转（PLAN §6.5）
  const app = await NestFactory.create(AppModule, { logger: createWinstonLogger() });

  // 全局链路（前缀/CORS/校验管道/响应壳/异常过滤）：与 e2e 同源，见 setup-app.ts
  setupApp(app);

  // 文档构建与 export-openapi.ts 同源（src/swagger.ts），运行时文档与导出契约永不漂移
  SwaggerModule.setup("api-docs", app, buildOpenApiDocument(app));

  await app.listen(app.get(ConfigService).get<number>("APP_PORT")!);
}
void bootstrap();
