import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Permission } from "../../permission/entities/permission.entity";

@Entity("store_role")
export class Role {
  @ApiProperty({ description: "角色 id" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "角色名称" })
  @Column({ length: 50, comment: "角色名称" })
  name: string;

  @ApiProperty({ description: "角色描述" })
  @Column({ length: 255, comment: "角色描述" })
  desc: string;

  @ApiProperty({ description: "创建时间" })
  @CreateDateColumn({ type: "timestamp", precision: 6, comment: "创建时间" })
  createTime: Date;

  @ApiProperty({ description: "更新时间" })
  @UpdateDateColumn({ type: "timestamp", precision: 6, comment: "更新时间" })
  updateTime: Date;

  @ApiProperty({ description: "是否系统内置 0 否 1 是（内置角色禁删）" })
  @Column({ type: "int", default: 0, comment: "是否为系统内置 0 否 1 是" })
  isSystem: number;

  @ApiProperty({ description: "角色拥有的权限点", type: [Permission], required: false })
  @ManyToMany(() => Permission)
  @JoinTable({
    name: "store_role_permission",
    joinColumn: { name: "roleId" },
    inverseJoinColumn: { name: "permissionId" },
  })
  permissions: Permission[];
}
