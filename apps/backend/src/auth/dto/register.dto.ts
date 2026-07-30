import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: '用户名', example: 'newuser' })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @MaxLength(32, { message: '用户名不能超过 32 个字符' })
  username: string;

  @ApiProperty({ description: '密码（6-72 位）', example: 'a123456' })
  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(72, { message: '密码不能超过 72 位' })
  password: string;

  @ApiPropertyOptional({ description: '邮箱' })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;
}
