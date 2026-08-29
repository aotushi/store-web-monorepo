import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class SendCaptchaDto {
  @ApiProperty({ description: "账号绑定邮箱", example: "user@example.com" })
  @IsEmail({}, { message: "邮箱格式不正确" })
  email: string;
}
