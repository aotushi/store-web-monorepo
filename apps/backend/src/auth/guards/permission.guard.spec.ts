import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import type { UserService } from "../../user/user.service";
import type { JwtPayload } from "./jwt-auth.guard";
import { PermissionGuard } from "./permission.guard";

// RBAC 判定语义（PLAN §6.6 点名测点）：与前端 can() 同语义，尤其 userType=0 超管旁路
// （种子数据超管角色只挂页面码，按钮码全靠旁路放行——原项目隐含设计）
describe("PermissionGuard", () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const userService = { getAuthInfo: jest.fn() };
  const guard = new PermissionGuard(
    reflector as unknown as Reflector,
    userService as unknown as UserService,
  );

  function mockContext(user?: JwtPayload): ExecutionContext {
    return {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  const waiter: JwtPayload = { sub: 2, username: "test1" };

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue("delete:user");
  });

  it("路由未声明 @RequirePermission → 登录即放行，不查权限", async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(mockContext(waiter))).resolves.toBe(true);
    expect(userService.getAuthInfo).not.toHaveBeenCalled();
  });

  it("无认证上下文（@Public 路由）→ 放行", async () => {
    await expect(guard.canActivate(mockContext(undefined))).resolves.toBe(true);
    expect(userService.getAuthInfo).not.toHaveBeenCalled();
  });

  it("token 有效但用户已被删除 → 403", async () => {
    userService.getAuthInfo.mockResolvedValue(null);

    await expect(guard.canActivate(mockContext(waiter))).rejects.toThrow("无权限执行该操作");
  });

  it("userType=0 超管旁路：码不在集合也放行", async () => {
    userService.getAuthInfo.mockResolvedValue({ userType: 0, codes: new Set<string>() });

    await expect(guard.canActivate(mockContext(waiter))).resolves.toBe(true);
  });

  it("普通用户持有权限码 → 放行", async () => {
    userService.getAuthInfo.mockResolvedValue({ userType: 1, codes: new Set(["delete:user"]) });

    await expect(guard.canActivate(mockContext(waiter))).resolves.toBe(true);
  });

  it("普通用户缺少权限码 → 403", async () => {
    userService.getAuthInfo.mockResolvedValue({ userType: 1, codes: new Set(["HotProductList"]) });

    await expect(guard.canActivate(mockContext(waiter))).rejects.toThrow("无权限执行该操作");
  });
});
