import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { JwtPayload } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { EditUserDto } from "./dto/edit-user.dto";
import { FreezeUserDto } from "./dto/freeze-user.dto";
import { UserQueryDto } from "./dto/user-query.dto";
import { User } from "./entities/user.entity";
import { UserService } from "./user.service";
import { CurrentUserVo } from "./vo/current-user.vo";
import { UserListVo } from "./vo/user-list.vo";

@ApiTags("user")
@ApiBearerAuth()
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 登录即可访问，不设权限码（原项目把它挂在 UserManage 下，导致低权限角色取不到自己的信息，属实现瑕疵）
  @Get("currentUser")
  @ApiOperation({ summary: "当前登录用户（含角色与权限点）" })
  @ApiOkResponse({ type: CurrentUserVo })
  currentUser(@CurrentUser() user: JwtPayload) {
    return this.userService.getCurrentUser(user.sub);
  }

  @Get("list")
  @RequirePermission("UserManage")
  @ApiOperation({ summary: "用户列表（分页 + 用户名模糊搜索）" })
  @ApiOkResponse({ type: UserListVo })
  list(@Query() query: UserQueryDto) {
    return this.userService.findPage(query);
  }

  @Patch("edit")
  @RequirePermission("UserManage")
  @ApiOperation({ summary: "编辑用户（资料 + 角色分配）" })
  @ApiOkResponse({ type: User })
  edit(@Body() dto: EditUserDto) {
    return this.userService.update(dto);
  }

  @Patch("freezed")
  @RequirePermission("freezed:user")
  @ApiOperation({ summary: "冻结/解冻用户" })
  @ApiOkResponse({ type: User })
  freezed(@Body() dto: FreezeUserDto, @CurrentUser() operator: JwtPayload) {
    return this.userService.setFreezed(dto, operator.sub);
  }

  // 原项目用 GET /user/delete/:id，GET 带副作用可被预取误触发，改为语义化 DELETE
  @Delete(":id")
  @RequirePermission("delete:user")
  @ApiOperation({ summary: "删除用户" })
  remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() operator: JwtPayload) {
    return this.userService.remove(id, operator.sub);
  }
}
