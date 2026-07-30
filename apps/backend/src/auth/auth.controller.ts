import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
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
}
