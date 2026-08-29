import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, IsNotEmpty } from "class-validator";

export class EditProductDto {
  @ApiProperty({ description: "商品 id" })
  @IsInt()
  @Min(1)
  id: number;

  @ApiPropertyOptional({ description: "商品名称" })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "商品名称不能为空" })
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: "商品描述" })
  @IsOptional()
  @IsString()
  desc?: string;

  @ApiPropertyOptional({ description: "商品价格" })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: "价格最多两位小数" })
  @Min(0.01, { message: "价格必须大于 0" })
  price?: number;

  @ApiPropertyOptional({ description: "商品图片" })
  @IsOptional()
  @IsString()
  images?: string;
}
