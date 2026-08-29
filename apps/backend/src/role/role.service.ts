import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";
import { Permission } from "../permission/entities/permission.entity";
import type { CreateRoleDto } from "./dto/create-role.dto";
import type { EditRoleDto } from "./dto/edit-role.dto";
import { Role } from "./entities/role.entity";

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission) private readonly permissionRepo: Repository<Permission>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<Role[]> {
    return this.roleRepo.find({ relations: { permissions: true } });
  }

  // 校验权限点 id 全部存在，返回实体列表
  private async resolvePermissions(ids: number[]): Promise<Permission[]> {
    const permissions = await this.permissionRepo.findBy({ id: In(ids) });
    if (permissions.length !== new Set(ids).size) {
      throw new BadRequestException("存在无效的权限点 id");
    }
    return permissions;
  }

  // 创建角色 + 权限点分配（save 级联写 store_role_permission 中间表）
  async create(dto: CreateRoleDto): Promise<Role> {
    const exists = await this.roleRepo.findOne({ where: { name: dto.name } });
    if (exists) throw new ConflictException("角色名称已存在");

    const role = this.roleRepo.create({ name: dto.name, desc: dto.desc });
    if (dto.permissionIds?.length) {
      role.permissions = await this.resolvePermissions(dto.permissionIds);
    }
    return this.roleRepo.save(role);
  }

  // 编辑角色 + 权限点整体替换（内置角色允许调整权限，只禁删除）
  async update(dto: EditRoleDto): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id: dto.id },
      relations: { permissions: true },
    });
    if (!role) throw new NotFoundException("角色不存在");

    if (dto.name !== undefined && dto.name !== role.name) {
      const exists = await this.roleRepo.findOne({ where: { name: dto.name } });
      if (exists) throw new ConflictException("角色名称已存在");
      role.name = dto.name;
    }
    if (dto.desc !== undefined) role.desc = dto.desc;
    if (dto.permissionIds) {
      role.permissions = await this.resolvePermissions(dto.permissionIds);
    }
    return this.roleRepo.save(role);
  }

  // 删除角色；清理两张中间表（role_permission + user_role 引用），多表写裹事务
  async remove(id: number): Promise<void> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException("角色不存在");
    if (role.isSystem === 1) throw new BadRequestException("系统内置角色不可删除");

    await this.dataSource.transaction(async (em) => {
      await em.query("DELETE FROM store_role_permission WHERE roleId = ?", [id]);
      await em.query("DELETE FROM store_user_role WHERE roleId = ?", [id]);
      await em.delete(Role, id);
    });
  }
}
