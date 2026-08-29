import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Role } from "../../role/entities/role.entity";

@Entity("store_user")
export class User {
  @ApiProperty({ description: "用户 id" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "用户名" })
  @Column({ length: 32, comment: "用户登录账号" })
  username: string;

  // 认证专用，默认查询不带出（PLAN §6：select:false），需要时 addSelect 显式取
  @Column({ length: 200, select: false, comment: "用户登录密码" })
  password: string;

  @Column({ length: 50, select: false, comment: "哈希加密的盐" })
  salt: string;

  @ApiProperty({ description: "用户类型 0 管理员 1 普通用户" })
  @Column({ type: "int", default: 1, comment: "用户类型 0 管理员 1 普通用户" })
  userType: number;

  @ApiProperty({ description: "邮箱" })
  @Column({ default: "", comment: "用户邮箱" })
  email: string;

  @ApiProperty({ description: "是否冻结 0 否 1 是（冻结后禁止登录）" })
  @Column({ type: "int", default: 0, comment: "是否冻结用户 0 不冻结 1 冻结" })
  freezed: number;

  @ApiProperty({ description: "头像" })
  @Column({ default: "", comment: "用户头像" })
  avatar: string;

  @ApiProperty({ description: "备注" })
  @Column({ default: "", comment: "用户备注" })
  desc: string;

  @ApiProperty({ description: "创建时间" })
  @CreateDateColumn({ type: "timestamp", precision: 6, comment: "创建时间" })
  createTime: Date;

  @ApiProperty({ description: "用户角色", type: [Role], required: false })
  @ManyToMany(() => Role)
  @JoinTable({
    name: "store_user_role",
    joinColumn: { name: "userId" },
    inverseJoinColumn: { name: "roleId" },
  })
  roles: Role[];
}
