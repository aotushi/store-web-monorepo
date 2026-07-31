import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { MailService } from '../common/mail/mail.service';
import { RedisService } from '../common/redis/redis.service';
import { UserService } from '../user/user.service';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { CaptchaVo } from './vo/captcha.vo';
import { LoginVo } from './vo/login.vo';

// 重置密码验证码：有效期 / 发送冷却 / 错误次数上限（超限即销毁，防 10^6 空间暴力试错）
const CAPTCHA_TTL_S = 300;
const CAPTCHA_COOLDOWN_S = 60;
const CAPTCHA_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
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

  // redis key（RedisModule 已统一加业务前缀）
  private captchaKey(email: string) {
    return `captcha:reset:${email}`;
  }
  private cooldownKey(email: string) {
    return `captcha:cooldown:${email}`;
  }
  private attemptsKey(email: string) {
    return `captcha:attempts:${email}`;
  }

  // 发送重置密码验证码：redis 存 TTL + 冷却防刷（PLAN §6.5 redis 用途清单之验证码）
  async sendResetCaptcha(email: string): Promise<CaptchaVo> {
    const user = await this.userService.findByEmail(email);
    // 学习项目取明确报错便于调试；生产应统一话术防邮箱枚举
    if (!user) throw new NotFoundException('该邮箱未绑定任何账号');

    if (await this.redis.exists(this.cooldownKey(email))) {
      throw new BadRequestException('验证码发送过于频繁，请稍后再试');
    }

    // Math.random 可被逆推（V8 xorshift128+），验证码必须走 crypto；[100000, 1000000) 恒 6 位
    const code = randomInt(100000, 1000000).toString();
    await this.redis.setex(this.captchaKey(email), CAPTCHA_TTL_S, code);
    await this.redis.setex(this.cooldownKey(email), CAPTCHA_COOLDOWN_S, '1');
    await this.redis.del(this.attemptsKey(email));

    await this.mail.send(
      email,
      '【store-web】重置密码验证码',
      `<p>您的验证码为 <b>${code}</b>，${CAPTCHA_TTL_S / 60} 分钟内有效。若非本人操作请忽略。</p>`,
    );
    return { ttl: CAPTCHA_TTL_S };
  }

  // 校验验证码并重置密码；验证码一次性使用，成功即销毁
  async resetPassword(dto: ResetPasswordDto): Promise<null> {
    const stored = await this.redis.get(this.captchaKey(dto.email));
    // 统一文案：不区分"未发送/已过期/不匹配"，不给攻击者反馈信号
    if (!stored) throw new BadRequestException('验证码错误或已过期');

    if (stored !== dto.captcha) {
      const attempts = await this.redis.incr(this.attemptsKey(dto.email));
      if (attempts === 1) await this.redis.expire(this.attemptsKey(dto.email), CAPTCHA_TTL_S);
      if (attempts >= CAPTCHA_MAX_ATTEMPTS) {
        await this.redis.del(this.captchaKey(dto.email), this.attemptsKey(dto.email));
        throw new BadRequestException('验证码错误次数过多已失效，请重新获取');
      }
      throw new BadRequestException('验证码错误或已过期');
    }

    const user = await this.userService.findByEmail(dto.email);
    if (!user) throw new NotFoundException('该邮箱未绑定任何账号');
    await this.userService.resetPassword(user.id, dto.newPassword);
    await this.redis.del(this.captchaKey(dto.email), this.attemptsKey(dto.email));
    return null;
  }
}
