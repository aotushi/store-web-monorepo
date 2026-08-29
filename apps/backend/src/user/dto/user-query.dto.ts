import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UserQueryDto {
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ description: "每页条数", default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize: number = 10;

  @ApiPropertyOptional({ description: "用户名模糊搜索" })
  @IsString()
  @IsOptional()
  username?: string;
}
