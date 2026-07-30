import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Min } from 'class-validator';

export class FreezeUserDto {
  @ApiProperty({ description: '用户 id' })
  @IsInt()
  @Min(1)
  id: number;

  @ApiProperty({ description: '0 解冻 1 冻结', enum: [0, 1] })
  @IsIn([0, 1], { message: 'freezed 只能是 0 或 1' })
  freezed: number;
}
