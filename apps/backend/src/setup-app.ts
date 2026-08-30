import { BadRequestException, ValidationPipe } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";

// 全局链路装配（PLAN §6.1）：main.ts 运行时与 e2e 测试同用一份，防两处漂移
// （同 src/swagger.ts 的契约同源决策；守卫不在此处——APP_GUARD 随 AppModule 自带）
export function setupApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  app.setGlobalPrefix(config.get<string>("API_PREFIX")!);

  // CORS 白名单 + 暴露 token 响应头（滑动续期新签 token 从响应头下发，PLAN §6.2）
  app.enableCors({
    origin: config.get<string>("CORS_ORIGINS")!.split(","),
    credentials: true,
    exposedHeaders: ["token"],
  });

  // 入参白名单+转换，校验失败产出字段级数组供前端表单回显
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
}
