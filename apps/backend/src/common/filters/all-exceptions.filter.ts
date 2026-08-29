import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from "@nestjs/common";
import { Response } from "express";

// 失败态统一出口（PLAN §6.1）：{ code, success: false, data: null, message }
// class-validator 400 时 message 透传字段级数组（exceptionFactory 产出），前端 form.setFields 直接消费
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      // Nest 内建异常 body 可能是 string 或 { message, ... }
      const message =
        typeof body === "string"
          ? body
          : ((body as { message?: unknown }).message ?? exception.message);
      res.status(status).json({ code: status, success: false, data: null, message });
      return;
    }

    // 非 HTTP 异常（DB/未知错误）：细节只进日志，不向客户端泄露
    this.logger.error(
      exception instanceof Error ? (exception.stack ?? exception.message) : exception,
    );
    res
      .status(500)
      .json({ code: 500, success: false, data: null, message: "Internal Server Error" });
  }
}
