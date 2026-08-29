import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { buildOpenApiDocument } from "./swagger";

// 导出 openapi.json（orval 的输入，契约链路 PLAN §5.3）
// 需要完整实例化 AppModule（TypeORM 会真连库），因此要求 docker mysql/redis 在线——dev 环境常驻形态
async function exportOpenApi() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix(app.get(ConfigService).get<string>("API_PREFIX")!);

  const document = buildOpenApiDocument(app);
  const target = join(process.cwd(), "openapi.json");
  writeFileSync(target, JSON.stringify(document, null, 2) + "\n");
  console.log(`openapi.json 已导出：${Object.keys(document.paths).length} 个路径 → ${target}`);

  await app.close();
}

void exportOpenApi();
