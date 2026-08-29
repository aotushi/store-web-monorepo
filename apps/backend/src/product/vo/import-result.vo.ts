import { ApiProperty } from "@nestjs/swagger";

export class ImportResultVo {
  @ApiProperty({ description: "成功导入条数" })
  imported: number;
}
