import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: '账号绑定邮箱', example: 'user@example.com' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({ description: '邮箱验证码（6 位数字）', example: '123456' })
  @IsString()
  @Length(6, 6, { message: '验证码为 6 位数字' })
  captcha: string;

  // 密码规则与注册保持一致
  @ApiProperty({ description: '新密码（6-72 位）', example: 'a654321' })
  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(72, { message: '密码不能超过 72 位' })
  newPassword: string;
}
