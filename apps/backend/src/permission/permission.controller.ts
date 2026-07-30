import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Permission } from './entities/permission.entity';
import { PermissionService } from './permission.service';

@ApiTags('permission')
@ApiBearerAuth()
@Controller('permission')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get('list')
  @RequirePermission('PermissionManage')
  @ApiOperation({ summary: '权限点列表（平铺）' })
  @ApiOkResponse({ type: [Permission] })
  list() {
    return this.permissionService.findAll();
  }
}
