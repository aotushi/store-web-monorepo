import { ApiProperty } from "@nestjs/swagger";
import { Activity } from "../entities/activity.entity";

export class ActivityListVo {
  @ApiProperty({ description: "当前页数据", type: [Activity] })
  list: Activity[];

  @ApiProperty({ description: "总条数" })
  total: number;
}
