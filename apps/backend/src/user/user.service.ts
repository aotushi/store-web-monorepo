import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../permission/entities/permission.entity';
import { User } from './entities/user.entity';
import { CurrentUserVo } from './vo/current-user.vo';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private readonly userRepo: Repository<User>) {}

  // 认证专用：把 select:false 的 password 显式带出
  findByUsernameWithPassword(username: string): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.username = :username', { username })
      .getOne();
  }

  // 当前用户 + 角色 + 权限点（前端登录后组装菜单/按钮权限的根接口）
  async getCurrentUser(id: number): Promise<CurrentUserVo> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: { roles: { permissions: true } },
    });
    if (!user) throw new NotFoundException('用户不存在');

    // 多角色权限点按 id 去重平铺
    const permMap = new Map<number, Permission>();
    for (const role of user.roles) {
      for (const p of role.permissions) permMap.set(p.id, p);
    }
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      userType: user.userType,
      roles: user.roles.map((r) => r.name),
      permissions: [...permMap.values()],
    };
  }

  // 权限码集合（PermissionGuard 消费）
  async getPermissionCodes(userId: number): Promise<Set<string>> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { roles: { permissions: true } },
    });
    const codes = new Set<string>();
    for (const role of user?.roles ?? []) {
      for (const p of role.permissions) codes.add(p.code);
    }
    return codes;
  }

  // 用户列表（分页/筛选等原接口形态到业务模块阶段补齐）
  findAll(): Promise<User[]> {
    return this.userRepo.find({ relations: { roles: true } });
  }
}
