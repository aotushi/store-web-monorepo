import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { JwtPayload } from "../../auth/guards/jwt-auth.guard";

// 取 JwtAuthGuard 挂到 req.user 的 JWT 载荷
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): JwtPayload => {
  return ctx.switchToHttp().getRequest<{ user: JwtPayload }>().user;
});
