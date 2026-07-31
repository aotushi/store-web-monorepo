import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { genSalt, hash } from 'bcryptjs';
import { DataSource, In, Like, Repository } from 'typeorm';
import type { RegisterDto } from '../auth/dto/register.dto';
import type { RegisterVo } from '../auth/vo/register.vo';
import { Permission } from '../permission/entities/permission.entity';
import { Role } from '../role/entities/role.entity';
import { User } from './entities/user.entity';
import type { EditUserDto } from './dto/edit-user.dto';
import type { FreezeUserDto } from './dto/freeze-user.dto';
import type { UserQueryDto } from './dto/user-query.dto';
import { CurrentUserVo } from './vo/current-user.vo';
import { UserListVo } from './vo/user-list.vo';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    private readonly dataSource: DataSource,
  ) {}

  // 认证专用：把 select:false 的 password 显式带出
  findByUsernameWithPassword(username: string): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.username = :username', { username })
      .getOne();
  }

  // 忘记密码流程用；原表 email 无唯一约束，findOne 取首个匹配（生产应建唯一索引）
  findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
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

  // 权限校验信息（PermissionGuard 消费）；userType=0 为超级管理员
  async getAuthInfo(userId: number): Promise<{ userType: number; codes: Set<string> } | null> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { roles: { permissions: true } },
    });
    if (!user) return null;
    const codes = new Set<string>();
    for (const role of user.roles) {
      for (const p of role.permissions) codes.add(p.code);
    }
    return { userType: user.userType, codes };
  }

  // 分页 + 用户名模糊搜索
  async findPage(query: UserQueryDto): Promise<UserListVo> {
    const [list, total] = await this.userRepo.findAndCount({
      where: query.username ? { username: Like(`%${query.username}%`) } : {},
      relations: { roles: true },
      order: { createTime: 'DESC' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return { list, total };
  }

  // 注册/创建用户：应用层查重（表无唯一索引，沿用原库结构）
  async createUser(dto: RegisterDto): Promise<RegisterVo> {
    const exists = await this.userRepo.findOne({ where: { username: dto.username } });
    if (exists) throw new ConflictException('用户名已存在');

    // bcrypt 的 salt 已内嵌在 hash 前 29 字符里，单独的 salt 列是原表设计冗余，写入只为兼容
    const salt = await genSalt(10);
    const user = this.userRepo.create({
      username: dto.username,
      password: await hash(dto.password, salt),
      salt,
      email: dto.email ?? '',
    });
    const saved = await this.userRepo.save(user);
    return { id: saved.id, username: saved.username };
  }

  // 重置密码：hash 策略与 createUser 一致（盐内嵌 + 冗余 salt 列兼容原表）
  async resetPassword(id: number, newPassword: string): Promise<void> {
    const salt = await genSalt(10);
    await this.userRepo.update(id, { password: await hash(newPassword, salt), salt });
  }

  // 编辑资料 + 角色整体替换（save 级联同步 store_user_role 中间表）
  async update(dto: EditUserDto): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: dto.id },
      relations: { roles: true },
    });
    if (!user) throw new NotFoundException('用户不存在');

    if (dto.email !== undefined) user.email = dto.email;
    if (dto.avatar !== undefined) user.avatar = dto.avatar;
    if (dto.desc !== undefined) user.desc = dto.desc;
    if (dto.roleIds) {
      const roles = await this.roleRepo.findBy({ id: In(dto.roleIds) });
      if (roles.length !== new Set(dto.roleIds).size) {
        throw new BadRequestException('存在无效的角色 id');
      }
      user.roles = roles;
    }
    return this.userRepo.save(user);
  }

  // 冻结/解冻；禁止操作自己（避免管理员把自己锁死）
  async setFreezed(dto: FreezeUserDto, operatorId: number): Promise<User> {
    if (dto.id === operatorId) throw new BadRequestException('不能冻结自己的账号');
    const user = await this.userRepo.findOne({ where: { id: dto.id } });
    if (!user) throw new NotFoundException('用户不存在');
    user.freezed = dto.freezed;
    return this.userRepo.save(user);
  }

  // 删除用户；表无外键约束，中间表需一并清理，多表写裹事务
  async remove(id: number, operatorId: number): Promise<void> {
    if (id === operatorId) throw new BadRequestException('不能删除自己的账号');
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');

    await this.dataSource.transaction(async (em) => {
      await em.query('DELETE FROM store_user_role WHERE userId = ?', [id]);
      await em.delete(User, id);
    });
  }
}
