import { ApiProperty } from "@nestjs/swagger";

export class CaptchaVo {
  @ApiProperty({ description: "验证码有效期（秒）", example: 300 })
  ttl: number;
}
