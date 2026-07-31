import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendCaptchaDto } from './dto/send-captcha.dto';
import { CaptchaVo } from './vo/captcha.vo';
import { LoginVo } from './vo/login.vo';
import { RegisterVo } from './vo/register.vo';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '登录' })
  @ApiOkResponse({ type: LoginVo })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  // 注册即创建用户（默认无角色，由管理员在用户管理里分配）
  @Public()
  @Post('register')
  @ApiOperation({ summary: '注册' })
  @ApiOkResponse({ type: RegisterVo })
  register(@Body() dto: RegisterDto) {
    return this.userService.createUser(dto);
  }

  // 忘记密码两步走（未登录场景，@Public）：接口名自定，原项目该功能不可考
  @Public()
  @Post('captcha')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送重置密码邮箱验证码' })
  @ApiOkResponse({ type: CaptchaVo })
  sendCaptcha(@Body() dto: SendCaptchaDto) {
    return this.authService.sendResetCaptcha(dto.email);
  }

  @Public()
  @Post('resetPassword')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '通过邮箱验证码重置密码' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
