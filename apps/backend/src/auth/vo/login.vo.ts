import { ApiProperty } from '@nestjs/swagger';

export class LoginVo {
  @ApiProperty({ description: 'JWT，后续请求放 Authorization: Bearer <token>' })
  token: string;

  @ApiProperty({ description: '用户 id' })
  id: number;

  @ApiProperty({ description: '用户名' })
  username: string;
}
