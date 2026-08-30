import type { DataSource, Repository } from "typeorm";
import type { Role } from "../role/entities/role.entity";
import type { User } from "./entities/user.entity";
import { UserService } from "./user.service";

// getAuthInfo 是 RBAC 权限计算的聚合侧（PLAN §6.6）：多角色权限码平铺去重成 Set，
// 判定侧见 permission.guard.spec.ts；只用到 userRepo，其余依赖占位
describe("UserService.getAuthInfo", () => {
  const userRepo = { findOne: jest.fn() };
  const service = new UserService(
    userRepo as unknown as Repository<User>,
    undefined as unknown as Repository<Role>,
    undefined as unknown as DataSource,
  );

  beforeEach(() => jest.clearAllMocks());

  it("跨角色权限码平铺去重，userType 透传", async () => {
    userRepo.findOne.mockResolvedValue({
      userType: 1,
      roles: [
        { permissions: [{ code: "UserManage" }, { code: "delete:user" }] },
        // 与首角色重叠的码去重、空角色不贡献码
        { permissions: [{ code: "delete:user" }, { code: "RoleManage" }] },
        { permissions: [] },
      ],
    });

    const info = await service.getAuthInfo(1);

    expect(info).not.toBeNull();
    expect(info!.userType).toBe(1);
    expect(info!.codes).toEqual(new Set(["UserManage", "delete:user", "RoleManage"]));
  });

  it("用户不存在 → null（守卫侧据此 403）", async () => {
    userRepo.findOne.mockResolvedValue(null);

    await expect(service.getAuthInfo(999)).resolves.toBeNull();
  });
});
