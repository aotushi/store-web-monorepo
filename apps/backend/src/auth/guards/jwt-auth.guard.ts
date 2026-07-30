import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

export interface JwtPayload {
  sub: number;
  username: string;
  iat?: number;
  exp?: number;
}

// 全局认证守卫（PLAN §6.2）：默认安全，@Public() 豁免
// 滑动续期：剩余有效期低于阈值时重签，新 token 放响应头（CORS exposedHeaders 已放行），前端拦截器静默替换
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('未登录');

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }
    req.user = payload;

    const remaining = (payload.exp ?? 0) - Math.floor(Date.now() / 1000);
    if (remaining < this.config.get<number>('JWT_RENEW_THRESHOLD_S')!) {
      const fresh = await this.jwt.signAsync({ sub: payload.sub, username: payload.username });
      context.switchToHttp().getResponse<Response>().setHeader('token', fresh);
    }
    return true;
  }
}
