import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// 权限点（store_permission）：MENU/PAGE/COMPON/按钮 四级，前端菜单树与按钮权限的同源数据
@Entity('store_permission')
export class Permission {
  @ApiProperty({ description: '权限点 id' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '权限名称（菜单名称）' })
  @Column({ length: 10, comment: '权限名称（菜单名称）' })
  title: string;

  @ApiProperty({ description: '权限码（唯一，接口鉴权与前端权限点同源）' })
  @Column({ length: 50, comment: '权限码' })
  code: string;

  @ApiProperty({ description: '权限类型 0 菜单 1 页面 2 组件 3 按钮' })
  @Column({ type: 'int', comment: '权限类型 0 菜单 1 页面 2 组件 3 按钮' })
  type: number;

  @ApiProperty({ description: '父级 id，0 为根' })
  @Column({ type: 'int', default: 0, comment: '父级id' })
  parentId: number;
}
