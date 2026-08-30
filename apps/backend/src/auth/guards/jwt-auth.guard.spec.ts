import type { ExecutionContext } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { Reflector } from "@nestjs/core";
import type { JwtService } from "@nestjs/jwt";
import { JwtAuthGuard } from "./jwt-auth.guard";
import type { JwtPayload } from "./jwt-auth.guard";

// 守卫是构造注入的纯类（PLAN §6.4 可测性边界的守卫侧对称面）：直构 + 手写依赖桩即测，
// 不起 Nest 容器；重点覆盖滑动续期的阈值分支（PLAN §6.6 点名测点）
describe("JwtAuthGuard", () => {
  const RENEW_THRESHOLD_S = 1800;

  const jwt = { verifyAsync: jest.fn(), signAsync: jest.fn() };
  const reflector = { getAllAndOverride: jest.fn() };
  const config = { get: jest.fn().mockReturnValue(RENEW_THRESHOLD_S) };
  const guard = new JwtAuthGuard(
    jwt as unknown as JwtService,
    reflector as unknown as Reflector,
    config as unknown as ConfigService,
  );

  const setHeader = jest.fn();
  function mockContext(authorization?: string): ExecutionContext {
    const req: { headers: { authorization?: string }; user?: JwtPayload } = {
      headers: { authorization },
    };
    return {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({ setHeader }) }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue(RENEW_THRESHOLD_S);
    reflector.getAllAndOverride.mockReturnValue(false);
  });

  it("@Public 路由直接放行，不触发 token 校验", async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(mockContext())).resolves.toBe(true);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it("无 token → 401 未登录", async () => {
    await expect(guard.canActivate(mockContext())).rejects.toThrow("未登录");
  });

  it("token 无效/过期 → 401 统一文案", async () => {
    jwt.verifyAsync.mockRejectedValue(new Error("jwt expired"));

    await expect(guard.canActivate(mockContext("Bearer bad-token"))).rejects.toThrow(
      "登录已过期，请重新登录",
    );
  });

  it("剩余有效期高于阈值 → 放行且不重签", async () => {
    const payload: JwtPayload = {
      sub: 1,
      username: "test",
      exp: Math.floor(Date.now() / 1000) + RENEW_THRESHOLD_S * 2,
    };
    jwt.verifyAsync.mockResolvedValue(payload);

    await expect(guard.canActivate(mockContext("Bearer ok"))).resolves.toBe(true);
    expect(setHeader).not.toHaveBeenCalled();
  });

  it("剩余有效期低于阈值 → 重签放 token 响应头，且新签 payload 不携带旧 exp", async () => {
    const payload: JwtPayload = {
      sub: 1,
      username: "test",
      exp: Math.floor(Date.now() / 1000) + 60,
    };
    jwt.verifyAsync.mockResolvedValue(payload);
    jwt.signAsync.mockResolvedValue("fresh-token");

    await expect(guard.canActivate(mockContext("Bearer ok"))).resolves.toBe(true);
    // 重签只带业务声明：残留旧 exp/iat 会让"续期"签出立刻过期的 token
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 1, username: "test" });
    expect(setHeader).toHaveBeenCalledWith("token", "fresh-token");
  });
});
