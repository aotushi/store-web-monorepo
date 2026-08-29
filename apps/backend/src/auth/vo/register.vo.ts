import { ApiProperty } from "@nestjs/swagger";

export class RegisterVo {
  @ApiProperty({ description: "用户 id" })
  id: number;

  @ApiProperty({ description: "用户名" })
  username: string;
}
