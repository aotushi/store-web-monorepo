import { ApiProperty } from "@nestjs/swagger";
import { User } from "../entities/user.entity";

export class UserListVo {
  @ApiProperty({ description: "当前页数据", type: [User] })
  list: User[];

  @ApiProperty({ description: "总条数" })
  total: number;
}
