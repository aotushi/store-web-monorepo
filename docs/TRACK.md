# 项目跟踪（TRACK）

> 单一入口掌握**接续点 / 进度 / 时间投入 / 临场决策**；每个工作 session 结束时更新本文件。
> 姊妹篇：[ISSUES.md](./ISSUES.md)（问题与坑）｜ [LEARNED.md](./LEARNED.md)（学习收获与面试素材）｜ [PLAN.md](./PLAN.md)（开工前决策，只在大方向变化时修订）

**最后更新**：2026-07-30

## NOW（会话接续点）

- **当前阶段**：2 后端（PLAN §9.2）——user/role CRUD 已上线并实测（25 项矩阵全过：注册/分页/角色分配/冻结/删除/事务清中间表/超管旁路/按钮码正反向）
- **下一步**：product/order/activity 业务模块 → common 横切（logger/mail/redis/excel）
- **测试账号**：`test / a123456`（超管）、`test1 / a123456`（服务员，用于 403 验证）
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
- [x] 首次提交（4 commits，conventional）+ 远程仓库 [aotushi/store-web-monorepo](https://github.com/aotushi/store-web-monorepo)（public，main 已跟踪；原名 nestjs-store-web-backend，2026-07-30 更名消除"仅后端"歧义）
- [ ] `pnpm check` 接入 `vp check`（待 frontend 立起，§4.3 完整形态）
- [ ] CI 补 test/build 步骤（待 apps 立起）
- [ ] fresh clone 验证 `pnpm install` 是否自动触发 prepare 挂钩（本次是手动 `pnpm exec husky` 挂的）

### 2 后端 🔨 进行中（2026-07-30 开工）

- [x] NestJS 11 脚手架进 `apps/backend`（清掉 eslint 生态与示例代码，格式统一交 Oxfmt/prettier 分域）
- [x] 全局链路四件套之三（PLAN §6.1）：响应壳拦截器 + 全捕获异常过滤器（两态对称）+ ValidationPipe（字段级 400 数组）；守卫等 auth 模块一起上
- [x] @nestjs/config + Joi fail-fast（PLAN §6.5）；TypeORM 连 docker mysql **3307**（synchronize:false）
- [x] terminus `/api/health` + swagger `/api-docs`（裸类型，壳前端剥，PLAN §7#11）
- [x] 验证：health 探活 database:up、404 失败壳对称、swagger 200
- [x] auth 核心：登录（bcryptjs + select:false）、全局 JwtAuthGuard + @Public、滑动续期（临期重签放响应头，实测触发）
- [x] RBAC 核心：@RequirePermission(code) + PermissionGuard（声明式，替代原 permission_api url 匹配）；三实体映射既有表
- [x] 实测矩阵 9 项：login 200/401、空表单 400 字段级数组、currentUser 401/200（roles+perms）、permission/list 超管 200 / 服务员 403
- [x] user/role CRUD：注册（开放）、list 分页+模糊搜索、编辑（资料+角色/权限点整体替换）、冻结（禁自冻）、删除（禁自删、isSystem 禁删、事务清中间表）；permission 只读（权限点与代码 @RequirePermission 同源，不提供写接口）
- [x] PermissionGuard 补 userType=0 超管旁路（种子数据超管角色只挂页面码，按钮码全在低权角色上——原项目隐含设计）
- [x] 实测矩阵 25 项：409 重名 / 400 弱密码 / 分页越界 / 无效 id / 自操作防御 / 401 冻结拦登录 / 403 按钮码反向 / 200 按钮码正向（服务员解冻）/ 删后中间表零孤儿
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
| 2026-07-30 | 1.5h  | 仓库更名 store-web-monorepo（compose 项目名解耦）；auth+RBAC：JWT 登录、全局双守卫、滑动续期、三实体映射，9 项实测 + 续期响应头实证                 | RBAC 核心上线               |
| 2026-07-30 | 1h    | user/role CRUD：注册/分页/编辑/冻结/删除 + 关系整体替换 + 事务清中间表；踩出种子数据真相（超管无按钮码 → userType 旁路；roleId=4 孤儿行）           | CRUD 上线（25 项矩阵）      |

## 临场决策（开工后新决策 / 与 PLAN 的偏离；大方向变化才回写 PLAN）

| 日期       | 决策                                                                          | 理由                                                                                               |
| ---------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 2026-07-30 | dev 启动形态：**混合式**——mysql/redis 进 docker 常驻，前后端本机 `pnpm dev`   | HMR/调试直挂；Windows bind mount 文件监听差；生产才全容器                                          |
| 2026-07-30 | MySQL 宿主端口 **3307**（容器内仍 3306）                                      | 本机 mysqld.exe 服务占 3306（ISSUES #1）；不动系统服务                                             |
| 2026-07-30 | 库名沿用原 dump `store_web_project`；compose 内置默认凭据，clone 后零配置可起 | 贴原项目 + 降低上手摩擦；密码可 .env 覆盖                                                          |
| 2026-07-30 | 认证自写 JwtAuthGuard（@nestjs/jwt），**不上 passport** 全家桶                | 代码更薄、原理透明（学习价值）；原项目对照性由表结构与接口路径保证                                 |
| 2026-07-30 | 密码库用 **bcryptjs**（纯 JS）替代 bcrypt（native）                           | pnpm 10 默认拦第三方 build script，native 编译在 Windows 多一层坑；hash 格式 $2a$ 完全兼容种子数据 |
| 2026-07-30 | `currentUser` 不挂权限码（登录即可）；原项目把它挂 UserManage 下              | 低权限角色登录后必须能取到自己的信息与菜单，原配置属实现瑕疵                                       |
| 2026-07-30 | PermissionGuard 增加 **userType=0 超管旁路**                                  | 种子数据实锤：超管角色只挂 8 个页面码，delete:user/freezed:user 反而在服务员身上，唯一自洽解释     |
| 2026-07-30 | 删除接口改语义化 **DELETE /user/:id、/role/:id**（原 GET /delete/:id）        | GET 带副作用违背 HTTP 语义，可被爬虫/预取误触发；/user/edit 等无害路径保持原样以便对照             |
| 2026-07-30 | permission 只读，不做增删改                                                   | 权限点与代码中 @RequirePermission 硬编码同源，运行时改表不改代码只会造成两边漂移                   |
