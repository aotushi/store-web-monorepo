import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { UserService } from '../user/user.service';
import { LoginVo } from './vo/login.vo';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwt: JwtService,
  ) {}

  // 登录：bcrypt 比对 + 冻结校验 → 签发 JWT
  async login(username: string, password: string): Promise<LoginVo> {
    const user = await this.userService.findByUsernameWithPassword(username);
    // 账号不存在与密码错误统一文案，不泄露账号是否存在
    if (!user || !(await compare(password, user.password))) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    if (user.freezed === 1) {
      throw new UnauthorizedException('账号已被冻结，请联系管理员');
    }

    const token = await this.jwt.signAsync({ sub: user.id, username: user.username });
    return { token, id: user.id, username: user.username };
  }
}
