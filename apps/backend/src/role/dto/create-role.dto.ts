import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateRoleDto {
  @ApiProperty({ description: "角色名称" })
  @IsString()
  @IsNotEmpty({ message: "角色名称不能为空" })
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: "角色描述" })
  @IsString()
  @IsNotEmpty({ message: "角色描述不能为空" })
  @MaxLength(255)
  desc: string;

  @ApiPropertyOptional({ description: "权限点 id 列表", type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  permissionIds?: number[];
}
