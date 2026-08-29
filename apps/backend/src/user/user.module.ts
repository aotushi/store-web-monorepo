import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Role } from "../role/entities/role.entity";
import { User } from "./entities/user.entity";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

@Module({
  // Role 仓储用于编辑用户时的角色分配
  imports: [TypeOrmModule.forFeature([User, Role])],
  controllers: [UserController],
  providers: [UserService],
  // PermissionGuard（全局）与 AuthService 依赖
  exports: [UserService],
})
export class UserModule {}
