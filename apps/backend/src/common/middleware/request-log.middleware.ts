import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

// 请求摘要日志：method/url/status/耗时/操作者（PLAN §6.5）
// 只落摘要、不落请求/响应体——密码、token、验证码天然不进日志；
// 用 middleware 而非 interceptor：res 'finish' 覆盖所有出口（守卫 401/403 时 interceptor 根本不执行）
@Injectable()
export class RequestLogMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on('finish', () => {
      // user 由 JwtAuthGuard 在后续管线挂上，finish 时已可读
      const user = (req as { user?: { username?: string } }).user?.username ?? '-';
      const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms user=${user}`;
      if (res.statusCode >= 500) this.logger.error(line);
      else if (res.statusCode >= 400) this.logger.warn(line);
      else this.logger.log(line);
    });
    next();
  }
}
