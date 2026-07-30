import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class EditUserDto {
  @ApiProperty({ description: '用户 id' })
  @IsInt()
  @Min(1)
  id: number;

  @ApiPropertyOptional({ description: '邮箱' })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @ApiPropertyOptional({ description: '头像' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  avatar?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  desc?: string;

  @ApiPropertyOptional({ description: '角色 id 列表（传入即整体替换）', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  roleIds?: number[];
}
