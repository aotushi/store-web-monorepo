import { ApiProperty } from '@nestjs/swagger';
import { Permission } from '../../permission/entities/permission.entity';

export class CurrentUserVo {
  @ApiProperty({ description: '用户 id' })
  id: number;

  @ApiProperty({ description: '用户名' })
  username: string;

  @ApiProperty({ description: '邮箱' })
  email: string;

  @ApiProperty({ description: '头像' })
  avatar: string;

  @ApiProperty({ description: '用户类型 0 管理员 1 普通用户' })
  userType: number;

  @ApiProperty({ description: '角色名列表', type: [String] })
  roles: string[];

  @ApiProperty({ description: '权限点去重平铺（前端组装菜单树 / 按钮权限）', type: [Permission] })
  permissions: Permission[];
}
