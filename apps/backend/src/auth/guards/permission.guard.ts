import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUIRE_PERMISSION_KEY } from '../../common/decorators/require-permission.decorator';
import { UserService } from '../../user/user.service';
import { JwtPayload } from './jwt-auth.guard';

// 权限守卫（PLAN §6.2）：消费 @RequirePermission(code)，未声明的路由登录即可访问
// 注册在 JwtAuthGuard 之后，req.user 已就位
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const code = this.reflector.getAllAndOverride<string>(REQUIRE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!code) return true;

    const { user } = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    // @Public 路由无认证上下文，不做权限校验
    if (!user) return true;

    const codes = await this.userService.getPermissionCodes(user.sub);
    if (!codes.has(code)) throw new ForbiddenException('无权限执行该操作');
    return true;
  }
}
