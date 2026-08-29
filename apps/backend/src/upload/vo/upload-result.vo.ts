import { ApiProperty } from "@nestjs/swagger";

export class UploadResultVo {
  @ApiProperty({ description: "可公开访问的图片路径（serve-static /uploads）" })
  url: string;

  @ApiProperty({ description: "文件大小（字节）" })
  size: number;
}
