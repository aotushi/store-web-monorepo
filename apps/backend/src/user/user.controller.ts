import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { CurrentUserVo } from './vo/current-user.vo';

@ApiTags('user')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 登录即可访问，不设权限码（原项目把它挂在 UserManage 下，导致低权限角色取不到自己的信息，属实现瑕疵）
  @Get('currentUser')
  @ApiOperation({ summary: '当前登录用户（含角色与权限点）' })
  @ApiOkResponse({ type: CurrentUserVo })
  currentUser(@CurrentUser() user: JwtPayload) {
    return this.userService.getCurrentUser(user.sub);
  }

  @Get('list')
  @RequirePermission('UserManage')
  @ApiOperation({ summary: '用户列表' })
  @ApiOkResponse({ type: [User] })
  list() {
    return this.userService.findAll();
  }
}
