import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CreateRoleDto } from "./dto/create-role.dto";
import { EditRoleDto } from "./dto/edit-role.dto";
import { Role } from "./entities/role.entity";
import { RoleService } from "./role.service";

@ApiTags("role")
@ApiBearerAuth()
@Controller("role")
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get("list")
  @RequirePermission("RoleManage")
  @ApiOperation({ summary: "角色列表（含权限点）" })
  @ApiOkResponse({ type: [Role] })
  list() {
    return this.roleService.findAll();
  }

  @Post("create")
  @RequirePermission("RoleManage")
  @ApiOperation({ summary: "创建角色（含权限点分配）" })
  @ApiOkResponse({ type: Role })
  create(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto);
  }

  @Patch("edit")
  @RequirePermission("RoleManage")
  @ApiOperation({ summary: "编辑角色（含权限点整体替换）" })
  @ApiOkResponse({ type: Role })
  edit(@Body() dto: EditRoleDto) {
    return this.roleService.update(dto);
  }

  // 原项目用 GET /role/delete/:id，改为语义化 DELETE（同 user 模块决策）
  @Delete(":id")
  @RequirePermission("delete:role")
  @ApiOperation({ summary: "删除角色（系统内置角色不可删）" })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.roleService.remove(id);
  }
}
