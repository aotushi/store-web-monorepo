import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Permission } from "./entities/permission.entity";

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission) private readonly permissionRepo: Repository<Permission>,
  ) {}

  // 平铺返回，树形结构由前端按 parentId 组装
  findAll(): Promise<Permission[]> {
    return this.permissionRepo.find();
  }
}
