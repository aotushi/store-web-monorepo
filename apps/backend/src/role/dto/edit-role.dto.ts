import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class EditRoleDto {
  @ApiProperty({ description: "角色 id" })
  @IsInt()
  @Min(1)
  id: number;

  @ApiPropertyOptional({ description: "角色名称" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: "角色描述" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  desc?: string;

  @ApiPropertyOptional({ description: "权限点 id 列表（传入即整体替换）", type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  permissionIds?: number[];
}
