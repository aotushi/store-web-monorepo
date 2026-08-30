import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/setup-app";

// auth e2e 冒烟（PLAN §6.6）：连真实 mysql/redis（本地 docker compose / CI services），
// 打通 全局前缀 → 守卫链 → service → 库 → 响应壳 的完整链路；账号来自 sql/ 种子数据
describe("auth (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    // 静音 Nest 启动日志；全局链路与 main.ts 同源（setup-app.ts）
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("正确凭据登录 → 200 成功壳 + token", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ username: "test", password: "a123456" })
      .expect(200);

    expect(res.body).toMatchObject({ code: 200, success: true, message: "ok" });
    expect(res.body.data.username).toBe("test");
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.token.length).toBeGreaterThan(0);
  });

  it("错误密码 → 401 失败壳（统一文案不泄露账号是否存在）", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ username: "test", password: "wrong-password" })
      .expect(401);

    expect(res.body).toEqual({
      code: 401,
      success: false,
      data: null,
      message: "用户名或密码错误",
    });
  });

  it("无 token 访问受保护接口 → 401（全局守卫在场）", async () => {
    const res = await request(app.getHttpServer()).get("/api/user/currentUser").expect(401);

    expect(res.body).toMatchObject({ code: 401, success: false, message: "未登录" });
  });

  it("带 token 取 currentUser → 200（角色与权限点随行）", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ username: "test", password: "a123456" })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get("/api/user/currentUser")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .expect(200);

    expect(res.body.data.username).toBe("test");
    // 种子数据：test 是 userType=0 超管，挂管理员角色；权限点为非空数组即可（数量随种子演进）
    expect(res.body.data.userType).toBe(0);
    expect(Array.isArray(res.body.data.roles)).toBe(true);
    expect(res.body.data.roles.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data.permissions)).toBe(true);
  });
});
