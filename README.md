# 数字门店系统（store-web-monorepo）

NestJS + React 全栈门店管理系统，对 [wenjianmin/store-web-backend](https://github.com/wenjianmin/store-web-backend) 与 [wenjianmin/store-web-frontend](https://github.com/wenjianmin/store-web-frontend) 的复刻学习项目：monorepo 化重组、全栈技术栈换代、文档驱动推进，作为求职作品与面试素材库。

复刻口径：数据库表结构与业务功能对齐原项目（表结构以 `sql/` 初始化脚本为准，运行时禁 synchronize）；实现层全面换代，并修正原项目的工程缺陷（GET 删除、响应体全量落日志、删除不清关系表等）。与原项目的完整差异清单见 [docs/TRACK.md](docs/TRACK.md) 的临场决策表。

## 技术栈

| 层     | 选型                                                                                                                                          |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 后端   | NestJS 11 · TypeORM（MySQL 8）· ioredis · 自写 JWT 守卫（单 token 滑动续期）· RBAC 双全局守卫 · winston · multer · exceljs · @nestjs/schedule |
| 前端   | React 18 + React Compiler · Vite 7 · TanStack Router（文件路由）+ Query · jotai · ky · antd 5 + pro-components                                |
| 契约   | swagger 装饰器 → openapi.json → orval 生成类型与 hooks（后端代码是类型单一事实来源）                                                          |
| 工程化 | pnpm workspace · vite-plus 三合一 check（oxfmt + oxlint + tsgolint）· prettier 分域 · husky + commitlint · Jest / vitest · GitHub Actions     |

## 快速开始

前置：Node ≥ 22、pnpm 10、Docker。

```bash
git clone https://github.com/aotushi/store-web-monorepo.git
cd store-web-monorepo
pnpm install                                     # prepare 自动挂 git hooks
docker compose up -d                             # mysql(3307) + redis(6379)，首次建卷自动导入 sql/ 种子
cp apps/backend/.env.example apps/backend/.env   # 默认值即 compose 凭据，可直接用
pnpm --filter backend dev                        # 另开终端：pnpm --filter frontend dev
```

- 入口：前端 http://localhost:5173 · API http://localhost:3000/api · Swagger http://localhost:3000/api-docs
- 测试账号：`test / a123456`（超级管理员）、`test1 / a123456`（服务员）

## 常用命令

| 命令                                      | 说明                                                               |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `pnpm check`                              | 静态门禁：vp 三合一（fmt + lint + type，全仓约 2s）+ prettier 检查 |
| `pnpm format`                             | 全仓格式化（oxfmt 管 js/ts，prettier 管其余）                      |
| `pnpm --filter backend test` / `test:e2e` | 后端单测 / e2e 冒烟（e2e 需 docker 服务在线）                      |
| `pnpm --filter frontend test`             | 前端 vitest                                                        |
| `pnpm --filter backend openapi`           | 导出 openapi.json（完整实例化应用，需 db/redis 在线）              |
| `pnpm --filter frontend apis`             | orval 按 openapi.json 重新生成前端 API 层                          |

## 仓库结构

```
apps/backend    NestJS 后端（src/ 按业务模块分层，test/ 为 e2e）
apps/frontend   React 前端（src/routes 文件路由，src/apis 为 orval 生成物）
sql/            数据库初始化脚本 + 种子演示图（seed-uploads/）
docs/           PLAN / TRACK / LEARNED / ISSUES 四件套
```

## 工程化亮点

- **clone 即跑**：`.env.example` 默认值 = compose 凭据 = CI services 凭据，种子数据（含演示图）随仓库走，本地 / docker / CI 三环境零手工配置
- **契约同源**：后端 swagger 装饰器是唯一类型来源，openapi.json 与 orval 生成物进 git，契约变更在 code review 的 diff 里可见
- **默认安全**：全局 JwtAuthGuard + PermissionGuard，`@Public` / `@RequirePermission` 声明式豁免与鉴权，权限码前后端同一张表
- **测试边界经过选择**：13 单测盯高危分支（RBAC 判定、续期阈值）+ 4 e2e 装配级冒烟；CI 分层门禁 check → 双端单测 → 双端构建 → services 种子导入 + e2e
- **面试素材化**：每阶段知识点与可讲点沉淀进 [docs/LEARNED.md](docs/LEARNED.md)，头部有按主题归组的素材索引

## 文档地图

| 文档                               | 内容                                            |
| ---------------------------------- | ----------------------------------------------- |
| [docs/PLAN.md](docs/PLAN.md)       | 开工前的全部设计决策（选型、边界、取舍）        |
| [docs/TRACK.md](docs/TRACK.md)     | 进度追踪 + 临场决策表（与原项目差异的完整清单） |
| [docs/LEARNED.md](docs/LEARNED.md) | 分阶段知识点 + 面试可讲素材（头部有主题索引）   |
| [docs/ISSUES.md](docs/ISSUES.md)   | 踩坑记录                                        |
