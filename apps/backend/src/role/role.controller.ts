import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Role } from './entities/role.entity';
import { RoleService } from './role.service';

@ApiTags('role')
@ApiBearerAuth()
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('list')
  @RequirePermission('RoleManage')
  @ApiOperation({ summary: '角色列表（含权限点）' })
  @ApiOkResponse({ type: [Role] })
  list() {
    return this.roleService.findAll();
  }
}
