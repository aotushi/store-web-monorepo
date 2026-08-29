import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateActivityDto {
  @ApiProperty({ description: "活动名称", example: "周末烧烤节" })
  @IsString()
  @IsNotEmpty({ message: "活动名称不能为空" })
  @MaxLength(30)
  name: string;

  @ApiProperty({ description: "活动类型 0 普通活动 1 拼团活动", enum: [0, 1] })
  @IsIn([0, 1], { message: "type 只能是 0 或 1" })
  type: number;

  @ApiPropertyOptional({ description: "活动描述" })
  @IsOptional()
  @IsString()
  desc?: string;

  @ApiProperty({ description: "活动开始时间（ISO 8601）", example: "2026-08-01T10:00:00+08:00" })
  @IsDateString({}, { message: "开始时间格式不正确" })
  startTime: string;

  @ApiProperty({ description: "活动结束时间（ISO 8601）", example: "2026-08-03T22:00:00+08:00" })
  @IsDateString({}, { message: "结束时间格式不正确" })
  endTime: string;

  @ApiProperty({ description: "参与活动的商品 id" })
  @IsInt()
  @Min(1)
  productId: number;
}
