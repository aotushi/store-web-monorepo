import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Permission } from "../permission/entities/permission.entity";
import { Role } from "./entities/role.entity";
import { RoleController } from "./role.controller";
import { RoleService } from "./role.service";

@Module({
  // Permission 仓储用于创建/编辑角色时的权限点分配
  imports: [TypeOrmModule.forFeature([Role, Permission])],
  controllers: [RoleController],
  providers: [RoleService],
})
export class RoleModule {}
