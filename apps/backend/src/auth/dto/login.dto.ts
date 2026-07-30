import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: '用户名', example: 'test' })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @MaxLength(32, { message: '用户名不能超过 32 个字符' })
  username: string;

  @ApiProperty({ description: '密码', example: 'a123456' })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;
}
