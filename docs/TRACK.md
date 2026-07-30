# 项目跟踪（TRACK）

> 单一入口掌握**接续点 / 进度 / 时间投入 / 临场决策**；每个工作 session 结束时更新本文件。
> 姊妹篇：[ISSUES.md](./ISSUES.md)（问题与坑）｜ [LEARNED.md](./LEARNED.md)（学习收获与面试素材）｜ [PLAN.md](./PLAN.md)（开工前决策，只在大方向变化时修订）

**最后更新**：2026-07-30

## NOW（会话接续点）

- **当前阶段**：2 后端（PLAN §9.2）——脚手架 + 全局链路已落地并验证
- **下一步**：auth + user/role/permission（RBAC 核心，JwtAuthGuard 全局 + @Public 豁免 + 滑动续期；swagger 从第一个模块写全）
- **环境**：dev 混合式——`docker compose up -d`（mysql:**3307** / redis:6379 常驻）+ 后端 `pnpm --filter backend dev`（http://localhost:3000/api，swagger /api-docs）
- **阻塞**：无

## 进度看板（对照 PLAN §9 推进顺序）

### 1 骨架 ✅（2026-07-30）

- [x] git init（main 分支）
- [x] `sql/` 原项目脚本拉取（10 表 + 种子数据：5 用户 / 4 角色 / 18 权限点，密码 bcrypt）
- [x] pnpm workspace（根 package.json + pnpm-workspace.yaml，apps/、packages/ 声明）
- [x] 一致性四件套：.editorconfig / .gitattributes（强制 LF）/ .vscode/（分语言 formatter + 插件推荐）/ .prettierrc+.prettierignore
- [x] 格式化分域落地：prettier 只管 `less/css/json/md/yml/html`（glob 限定），js/ts 留给 Oxfmt
- [x] 两道闸（本地）：husky pre-commit=`pnpm check`、commit-msg=commitlint（conventional，已冒烟验证）
- [x] CI 骨架（GitHub Actions：install + check）
- [x] docker-compose：mysql:8（宿主 **3307**）+ redis:7 + healthcheck + sql 初始化挂载
- [x] 验证：双容器 healthy、10 表 + 种子就位、`pnpm check` 绿、钩子路径已挂
- [x] 首次提交（4 commits，conventional）+ 远程仓库 [aotushi/nestjs-store-web-backend](https://github.com/aotushi/nestjs-store-web-backend)（public，main 已跟踪）
- [ ] `pnpm check` 接入 `vp check`（待 frontend 立起，§4.3 完整形态）
- [ ] CI 补 test/build 步骤（待 apps 立起）
- [ ] fresh clone 验证 `pnpm install` 是否自动触发 prepare 挂钩（本次是手动 `pnpm exec husky` 挂的）

### 2 后端 🔨 进行中（2026-07-30 开工）

- [x] NestJS 11 脚手架进 `apps/backend`（清掉 eslint 生态与示例代码，格式统一交 Oxfmt/prettier 分域）
- [x] 全局链路四件套之三（PLAN §6.1）：响应壳拦截器 + 全捕获异常过滤器（两态对称）+ ValidationPipe（字段级 400 数组）；守卫等 auth 模块一起上
- [x] @nestjs/config + Joi fail-fast（PLAN §6.5）；TypeORM 连 docker mysql **3307**（synchronize:false）
- [x] terminus `/api/health` + swagger `/api-docs`（裸类型，壳前端剥，PLAN §7#11）
- [x] 验证：health 探活 database:up、404 失败壳对称、swagger 200
- [ ] auth + user/role/permission（RBAC 核心）
- [ ] product/order/activity
- [ ] common 横切（logger/mail/redis/excel）
- [ ] schedule/上传

### 3 契约链路 ⏳ 未开始（openapi.json → orval）

### 4 前端 ⏳ 未开始（脚手架 → 登录 → 权限四件套 → 业务页 → 看板）

### 5 收尾 ⏳ 未开始（websee / crawler，可砍）

## 时间线（session 日志；耗时为粗估）

| 日期       | 耗时≈ | 内容                                                                                                                                                | 产出                        |
| ---------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 2026-07-30 | 0.5h  | 骨架期开工：监控文档三件套、git init、workspace、工程化两道闸、docker-compose 起库并验证                                                            | 骨架完成（待提交）          |
| 2026-07-30 | 1h    | 首次提交 + 建远程仓库（aotushi）；后端开工：NestJS 11 脚手架、响应壳/异常/校验全局链路、config Joi、TypeORM 连 3307、health+swagger，起服务实测通过 | 后端骨架上线（feat commit） |

## 临场决策（开工后新决策 / 与 PLAN 的偏离；大方向变化才回写 PLAN）

| 日期       | 决策                                                                          | 理由                                                      |
| ---------- | ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| 2026-07-30 | dev 启动形态：**混合式**——mysql/redis 进 docker 常驻，前后端本机 `pnpm dev`   | HMR/调试直挂；Windows bind mount 文件监听差；生产才全容器 |
| 2026-07-30 | MySQL 宿主端口 **3307**（容器内仍 3306）                                      | 本机 mysqld.exe 服务占 3306（ISSUES #1）；不动系统服务    |
| 2026-07-30 | 库名沿用原 dump `store_web_project`；compose 内置默认凭据，clone 后零配置可起 | 贴原项目 + 降低上手摩擦；密码可 .env 覆盖                 |
