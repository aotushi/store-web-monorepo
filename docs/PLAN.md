# store-web monorepo 复刻规划大纲

> 建档：2026-07-29 ｜ 状态：规划已定，未开工
> 目标：复刻学习数字门店系统，**后端架构不变、前端选型现代化**，前后端合入 monorepo

## 1. 原项目

|      | 仓库                                                                              | 技术栈                                                                     |
| ---- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 后端 | [wenjianmin/store-web-backend](https://github.com/wenjianmin/store-web-backend)   | NestJS 10 + Express + TypeORM 0.3 + MySQL + Redis                          |
| 前端 | [wenjianmin/store-web-frontend](https://github.com/wenjianmin/store-web-frontend) | Vite 5 + React 18 + antd 5 (Pro Components) + MobX + React Router 6 + Less |

**后端模块**：`auth`（Passport JWT+Local）、`user/role/permission`（RBAC）、`product/order/activity`（业务）、`sys`；`common/` 横切：logger(winston)、mail(nodemailer)、redis、excel(exceljs)、crawler(Crawlee+Playwright)、decorators、utils；另有 @nestjs/schedule 定时任务、multer 上传、serve-static、`sql/` 建表脚本。

**前端结构**：`apis/`（按模块分）、`pages/`（登录注册/忘记密码、权限管理四件套 用户/角色/资源/组件、产品/订单/活动、首页看板）、`store/`(MobX)、`layout/`、`components/`；websee 前端监控；husky + lint-staged + commitlint。

## 2. 核心决策（已定）

| 决策点           | 结论                                                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 仓库形态         | monorepo，**pnpm workspace**，不上 Turborepo/Nx（两个包不需要，后续可加）                                                                                                                     |
| 仓库位置         | `E:\code\github\resume\store-web-monorepo`（本目录，git init 起步）                                                                                                                           |
| React            | **18**（与原项目同大版本，对照性最好；antd 5 原生支持区间 16–18，免 patch）                                                                                                                   |
| React Compiler   | **开启**——全员禁手写 memo/useMemo/useCallback（评审争议点消灭）；React 18 需装 `react-compiler-runtime`（dependencies）+ 编译插件 `target: '18'`；与 Vite+ 转换链的兼容性骨架期验证，见 §7#10 |
| 工具链           | **Vite+ (beta)**：`vp check` = Oxfmt + Oxlint + tsgolint 类型检查；`vp test` = Vitest                                                                                                         |
| 后端框架         | NestJS 11（Express 5），TypeORM 不换（后端架构不变，不迁 Prisma）                                                                                                                             |
| 后端架构约定     | 统一响应壳四字段、全局守卫默认安全、ValidationPipe whitelist+transform、synchronize:false，详见 §6                                                                                            |
| 状态方案         | **状态三分法**：TanStack Query（服务端）+ Jotai（客户端）+ RxJS（事件流），**MobX 移除**，详见 §5                                                                                             |
| 路由             | **TanStack Router**（类型安全路由 + search params 一等公民 + Query 集成）                                                                                                                     |
| HTTP 底座        | **ky**（fetch 系轻包装；若要面试对照性可换回 axios，一句话的事）                                                                                                                              |
| API 契约         | **@nestjs/swagger + orval**：后端 OpenAPI → 自动生成前端 TanStack Query hooks，详见 §5.3                                                                                                      |
| 数据库环境       | Docker Compose：mysql:8 + redis:7，原 `sql/` 脚本挂初始化目录                                                                                                                                 |
| 认证             | **单 JWT + 滑动续期**（后端临期重签放响应头、前端拦截器静默替换，参照神光小册"单 token 无限续期"）；token 落 localStorage（登录态恢复所需，接受 XSS 取舍）                                    |
| 路由权限         | **文件路由（file-based）+ 静态路由 + 前端权限过滤**；beforeLoad 守卫 + context 注入权限                                                                                                       |
| 权限模型         | 复刻原项目三级权限点 **MENU/PAGE/COMPON**；匹配依据由 title 字符串改为**唯一 code**（修原实现瑕疵）                                                                                           |
| Layout           | **ProLayout + PageContainer**（原项目同款，直接复刻）                                                                                                                                         |
| i18n             | **不做**（原项目也没有）                                                                                                                                                                      |
| 多页签/KeepAlive | **不做**；React 18 无官方方案，将来若做需先升 React 19.2+ 用官方 `<Activity>`，禁第三方 keep-alive 库                                                                                         |
| 样式             | **CSS Modules（.module.less）**：Less 语法保留、作用域隔离；antd 定制走 token                                                                                                                 |
| 表单             | 保持 antd Form / ProForm（不上 TanStack Form，克制）                                                                                                                                          |
| 工具库           | lodash → **es-toolkit**（`es-toolkit/compat` 兼容层，零成本换）                                                                                                                               |
| mock 层          | **砍掉**（vite-plugin-mock 对 Vite 8 兼容未知，后端就在旁边）                                                                                                                                 |
| stylelint        | **砍掉**（价值低）                                                                                                                                                                            |
| 后端测试         | 保持 Jest（贴近原项目；vp test 测 Nest 需额外配装饰器，不折腾）                                                                                                                               |

### 目录结构

```
store-web-monorepo/                # monorepo 根
├── apps/
│   ├── backend/                   # NestJS 11
│   └── frontend/                  # React 19 admin
├── packages/                      # 预留（共享类型已由 orval 生成链路覆盖，视需要再立包）
├── docs/                          # 本文档、intro.txt 留档
├── docker-compose.yml             # mysql:8 + redis:7
├── pnpm-workspace.yaml
└── package.json                   # 根：格式化/钩子/统一脚本
```

## 3. 版本升级 / 替换映射

| 依赖                      | 原版本    | 目标                            | 备注                                                   |
| ------------------------- | --------- | ------------------------------- | ------------------------------------------------------ |
| Node                      | —         | 22（本机 22.19 已就位）         | NestJS 11 要求 ≥20                                     |
| NestJS                    | 10        | 11                              | 平台默认 Express 5                                     |
| TypeORM                   | 0.3.x     | 0.3 最新                        |                                                        |
| multer                    | 1.4.5-lts | 2.x                             | **1.x 有 CVE，必升**                                   |
| Vite                      | 5         | 8（Vite+ 内含，Rolldown）       |                                                        |
| React                     | 18        | 18（保持，取 18.x 最新）        | TanStack Query v5 / Router 最低要求恰为 18，选型全兼容 |
| antd                      | 5.15      | 5.x 最新                        | 不动大版本                                             |
| React Router 6            | →         | **TanStack Router**（替换）     | search params 类型化、loader 预取                      |
| MobX + mobx-react         | →         | **移除**，改 Jotai + Query + rx | 见 §5                                                  |
| axios                     | →         | **ky**（替换）                  | 拦截逻辑迁到 ky hooks                                  |
| lodash                    | →         | **es-toolkit**（替换）          | 快 2-3 倍，体积小 97%                                  |
| ahooks                    | 3.x       | 保留最新                        | **禁用其 useRequest**（与 Query 重叠）                 |
| ESLint 8                  | →         | **Oxlint**（vp）                | ESLint 整个移除                                        |
| Prettier(JS/TS)           | 2         | **Oxfmt**（vp）                 | Prettier 降级为样式/杂类专用，见 §4                    |
| husky                     | 8         | 9                               |                                                        |
| mockjs / vite-plugin-mock | —         | 移除                            |                                                        |
| 其余业务依赖              | —         | 各自最新                        |                                                        |

## 4. 工程化方案（按公共项目多人协作标准）

### 4.1 格式化分域（扩展名硬划界，零重叠）

| 工具     | 管辖                                    | 驱动           |
| -------- | --------------------------------------- | -------------- |
| Oxfmt    | `.js .jsx .ts .tsx`                     | `vp check`     |
| Prettier | `.less .css .json .md .yml .yaml .html` | 独立 glob 限定 |

选型理由：全 Prettier 丢掉 Vite+ 一体化；Biome 不支持 Less；dprint+malva 太小众。Oxfmt+Prettier 分域是当前 Rust 工具链项目主流搭配。SQL 文件明确排除在强制格式化外。

### 4.2 一致性四件套

1. `.editorconfig` — 缩进/charset/末尾空行，跨 IDE 最低公分母
2. `.gitattributes` — `* text=auto eol=lf`，仓库级强制 LF（Windows 成员 autocrlf 不可靠，此为唯一解）
3. `.vscode/` 提交进仓库 — `settings.json` 按语言指定 defaultFormatter（ts/js→oxc 扩展，其余→prettier 扩展）+ formatOnSave；`extensions.json` 插件推荐清单
4. 全部格式化配置文件进仓库 — `.prettierrc`、`.prettierignore`、oxfmt 配置，无本地私有配置

### 4.3 统一命令入口（根 package.json）

```
pnpm check   →  vp check（oxfmt+oxlint+类型检查） + prettier --check
pnpm format  →  vp 修复模式 + prettier --write
```

### 4.4 强制执行两道闸

- **本地**：husky `pre-commit` → `pnpm check`（全量，仓库从零开始永远干净，工具快到无感，不需要 lint-staged）；`commit-msg` → commitlint（conventional commits）
- **CI**：GitHub Actions → `pnpm check → test → build`。钩子可被 `--no-verify` 绕过，CI 是真门禁（原项目无 CI，按公共项目标准补上）

## 5. 前端应用架构（状态三分法）

> 思路来源：[一文搞定前端请求](https://zhuanlan.zhihu.com/p/1970262111033754347)——请求的本质问题 = 竞态（key 取最新）+ 多组件共享（状态管理）；请求层应建立在状态管理之上。本方案在其 Jotai+rx 基础上引入 TanStack Query，补掉自研方案无 devtools 的短板。

### 5.1 分层

| 状态类型   | 工具                                                                 | 职责                                                                                                       |
| ---------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 服务端状态 | TanStack Query                                                       | 缓存、失效重取、竞态（queryKey 变更自动弃旧）、Devtools                                                    |
| 客户端状态 | Jotai                                                                | atom + useAtomValue 为主；`createStore()/getDefaultStore()` 提供全局 store.get/set/sub（内建，逃逸 hooks） |
| 事件流     | RxJS                                                                 | debounce/switchMap/轮询/埋点管道                                                                           |
| 桥接       | jotai-tanstack-query（atomWithQuery）+ jotai 内建 atomWithObservable | query 原子化；Observable → atom                                                                            |

数据流向：**rx 流出口写进 atom，query 经 atomWithQuery 原子化，组件只面对 atom 和 useQuery 两种读法。**

### 5.2 团队边界约定（多人协作防滥用）

1. 常规页面请求直接 `useQuery`；仅当需要跨组件派生、或与客户端状态组合时，才用 `atomWithQuery`
2. RxJS 只准出现在明确的流场景（搜索联想、轮询、事件总线），**禁止用 rx 写普通请求**
3. ahooks 的 useRequest 禁用（与 Query 职责重叠）
4. 请求读写分离：查询走 query，写操作走 mutation，不混用
5. 服务端交互一律 Query/mutation（React 18 无 `use()`/`useOptimistic`/form Actions，天然无两套写法问题）；ref 透传用标准 `forwardRef`（ref as prop 是 19 特性，18 不可用）

### 5.3 API 契约链路

```
NestJS controller/DTO（@nestjs/swagger 装饰器）
  → openapi.json
  → orval 生成 apps/frontend/src/apis/（类型 + TanStack Query hooks，产物不手改）
```

- 后端代码是类型的单一事实来源，替代手写 `apis/` 目录与手写共享 DTO 包
- 要求：后端 DTO 必须写全 `@ApiProperty`，否则生成的类型不完整（纪律项）

### 5.4 状态与通信层依赖清单

```
├── @tanstack/react-query             # 服务端状态
├── @tanstack/react-query-devtools    # 调试
├── @tanstack/react-router            # 路由
├── @tanstack/router-devtools         # 路由调试
├── jotai                             # 客户端状态；全局 store 与 atomWithObservable 均为内建
├── jotai-tanstack-query              # atomWithQuery / atomWithMutation
├── jotai-devtools                    # 调试（可选）
├── rxjs                              # 事件流
├── ky                                # HTTP 底座（token 注入/401/错误提示走 ky hooks）
├── es-toolkit                        # 工具函数
└── ahooks                            # 杂项 hooks（useRequest 禁用）
```

### 5.5 认证与权限设计（已拍板）

```
登录 → 单 JWT（localStorage）→ getCurrentUserInfo → menus 权限点列表 → Jotai atom
  ├─ 菜单：静态路由表 × 权限点(MENU/PAGE) 过滤 hideInMenu
  ├─ 页面：TanStack Router beforeLoad 守卫（无权 → 403，无 token → /login）
  ├─ 按钮：<Permission code="..."> 组件 + usePermission hook 双形态（COMPON 级）
  └─ 续期：滑动续期——后端 Guard verify 通过后重签 token 写响应头 `token`；
            前端 ky afterResponse hook 读 `response.headers['token']` 替换 localStorage + atom。
            无独立 refresh 接口、无 401 重放队列；401 唯一语义 = 跳登录。
            跨域部署需 enableCors({ exposedHeaders: ['token'] })，否则前端读不到该头
            （dev 走 vite proxy 同源无此问题）
```

小册原文细节（2026-07 已核对全文）：

- 原文 Guard 内 verify 通过即 `response.setHeader('token', sign(...))`——**每次请求都重签**；
  作者在总结自注"这节写的有点问题，单 token 应该在快过期的时候返回新 token"。
  本项目直接采用优化版：**剩余有效期 < 阈值（如 1 天）才重签**，其余请求不发该头。
- 评论区另提"Redis 记录 token 唯一性防滥用"——牺牲 JWT 无状态性，第一版不做。

- 权限点匹配用唯一 **code**（原项目 title 字符串匹配是瑕疵，不复刻）
- 预留后端动态路由扩展点，第一版不做

### 5.6 固定套路清单（已同意，细节实现时定）

| 套路          | 要点                                                                                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CRUD 标准写法 | ProTable × TanStack Query；**列表筛选/分页状态进 URL**（TanStack Router search params 闭环）；沉淀为用户管理模块样板                                                  |
| 错误处理      | 请求错误：后端统一响应结构 + 错误码约定 → ky 归一化 → Query 全局 onError toast → 403/404/500 错误页；渲染崩溃另走全局 ErrorBoundary + 路由级 errorComponent，两链分开 |
| 主题系统      | antd ConfigProvider + darkAlgorithm；CSS Modules 消费 antd token；偏好持久化 atomWithStorage                                                                          |
| 数据字典      | 长 staleTime 字典 query + useDict hook + 字典下拉/回显组件                                                                                                            |
| loading 约定  | 默认 `isPending` 手工判断（ProTable 自管 loading 占大头）；路由切换用 Router `defaultPendingComponent`；Suspense/useSuspenseQuery 不作为团队默认                      |
| 表单校验      | 双层——antd rules 仅体验层，后端 class-validator 是权威层；约定 400 字段级错误结构 → `form.setFields` 回填；不引 zod（antd Form 生态下重复）                           |

### 5.7 工程规范（已同意）

- **目录组织**：TanStack Router 文件路由目录 + 按模块特性目录；orval 生成物独立目录不手改；组件归属——跨页面复用进 `src/components/`，页面私有放页面目录内
- **状态持久化清单**：token、主题偏好、布局折叠态（atomWithStorage）；其余状态不落地
- **前端测试边界**：纯逻辑必测（权限过滤、滑动续期 hook、工具函数）；组件测试第一版不强制
- **文档体系**：参照 admin-backend-3/apps/page 模式——`docs/architecture` 约束文档 + 按技术点学习文档 + 学习地图
- **基础约定**（骨架期一次定死）：
  - 路径别名 `@/ → src/`（tsconfig paths + vite alias 各配一处）
  - env：`VITE_` 前缀 + `vite-env.d.ts` 类型声明 + `src/config/env.ts` 统一出口，禁散用 `import.meta.env`
  - 端口/代理：后端 3000、前端 5173；vite proxy `/api` → 3000
  - 时间库统一 dayjs（antd 5 内置依赖），禁混入 moment / date-fns
  - 浏览器目标：vite 现代基线，不做旧浏览器兼容
  - 金额字段：后端存**分**（int），前端展示层转元（契约纪律）

## 6. 后端应用架构（与 §5 对称的约定层，已拍板）

> 原项目已有的骨架（响应壳/异常过滤器/winston/@nestjs/config/模块目录）全部沿用；本节记录在其之上的**修齐与收紧**——原项目多处裸配（`cors: true`、无参 ValidationPipe、逐路由挂守卫、无 swagger），按公共多人项目标准升级。

### 6.1 全局请求链路（壳 → 校验 → 异常）

| 件             | 约定                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 统一响应壳     | `{ code, success, data, message }` 四字段**两态对称**（原项目成功壳缺 message、失败壳多 type 字段，修齐不复刻）；code 以 HTTP status 为主，预留业务码段 |
| 异常过滤器     | HttpException → 壳的失败态；class-validator 的 400 错误保留**字段级数组结构**（前端 `form.setFields` 回填依赖，呼应 §5.6 表单校验）                     |
| ValidationPipe | 全局注册，**`whitelist + transform` 必开**（原项目裸 `new ValidationPipe()`，未声明字段直通有入库风险）                                                 |
| CORS           | origin 白名单（原项目 `cors: true` 裸开）+ `exposedHeaders: ['token']`（§5.5 续期依赖）                                                                 |

### 6.2 认证与授权（默认安全）

- **守卫全局化**：`APP_GUARD` 注册 JwtAuthGuard + `@Public()` 装饰器豁免登录/注册等白名单——**漏挂 = 拒绝而非裸奔**（原项目逐 controller 挂，默认不安全）；passport 体系保留（架构不变）
- **RBAC 第二层**：`@RequirePermission(code)` + PermissionGuard 读 metadata；权限 code 与前端 COMPON 点**同一套**——后端是安全权威，前端隐藏按钮只是体验层（§5.5）
- **滑动续期重签**挂在全局 JwtAuthGuard 内（剩余有效期 < 阈值才重签，§5.5 已定）

### 6.3 数据层

- TypeORM **`synchronize: false`**，表结构以原 `sql/` 脚本为准挂 docker 初始化；migration 列二期学习点
- 多表写操作必须 `dataSource.transaction()`（如订单 + 订单明细）

### 6.4 模块结构与 DTO 纪律

- 模块目录沿用原标准：`dto/ entities/ *.controller.ts *.service.ts *.module.ts`；横切统一进 `common/`（filters/interceptors/decorators/enums/utils，沿用原目录族）
- 两条边界：**controller 薄层**（路由 + DTO + swagger 装饰器，不写业务）；**service 不碰 req/res**（可测性）
- DTO：输入 Dto / 输出 Vo 分离；`PartialType/PickType` 复用；`@ApiTags` 按模块 + `@ApiBearerAuth`（原项目**没有 swagger**，契约链整条是本项目新增，§5.3）

### 6.5 配置、安全与日志

- @nestjs/config 全局 + `validationSchema` 启动 fail-fast；**禁散用 `process.env`**（对称前端禁散用 `import.meta.env`）
- 密码 bcrypt 哈希；entity 密码列 `select: false`，响应链路不出现密码字段
- helmet + @nestjs/throttler（登录/验证码接口限流）
- winston 沿用，但改**请求摘要日志**（method/url/status/耗时）——原项目 ResponseInterceptor 全量 `JSON.stringify` 响应体落日志是坏味道；密码/token 不落日志
- redis 用途清单：验证码 TTL、缓存 key 统一前缀

### 6.6 质量约定

- **后端测试边界**（对称 §5.7）：service 纯逻辑必测（RBAC 权限计算、续期阈值判断）+ auth 一条 e2e 冒烟；controller 薄层不强制
- 种子数据：`sql/` 初始化含演示账号清单（前端联调依赖）
- `/health`（@nestjs/terminus）供 docker healthcheck

## 7. 已知坑与预案

| #   | 坑                                                              | 预案                                                                                                                                                                             |
| --- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 将来升 React 19                                                 | 现基线 18 无 antd 兼容坑；届时需：装 `@ant-design/v5-patch-for-react-19`、forwardRef → ref as prop 迁移、Compiler `target` 改 '19' 并卸 `react-compiler-runtime`                 |
| 2   | Express 5 (path-to-regexp 换代)                                 | 通配符路由 `*` 改命名形式如 `{*path}`，注意原中间件排除规则                                                                                                                      |
| 3   | websee SDK（2023 年停更）                                       | 主要劫持 window 层事件、对 React 内部依赖浅，风险中低；**放最后接入，跑不通就砍**                                                                                                |
| 4   | crawler 模块（Playwright 重依赖）                               | 放最后复刻，初期在 module 注释掉，不阻塞主线                                                                                                                                     |
| 5   | `vp check` 类型检查 × NestJS 装饰器工程                         | 若有坑，后端退回 `tsc --noEmit`                                                                                                                                                  |
| 6   | Vite Task 编排（beta）                                          | 若不稳，退回 `pnpm --filter` 脚本                                                                                                                                                |
| 7   | Vite+ beta 整体                                                 | 刚发一个月，踩坑资料少，遇问题啃 issue（学习加分项，心理预期要有）                                                                                                               |
| 8   | TanStack Router 与原项目写法差异大                              | 复刻对照性下降是已接受的代价；学习曲线比 RR 陡，路由骨架先行搭样板                                                                                                               |
| 9   | orval 产物质量取决于 swagger 装饰器完备性                       | 后端 DTO 写全 @ApiProperty 作为纪律项；生成物进 git 便于 review                                                                                                                  |
| 10  | React Compiler × Vite+ rolldown/oxc 转换链                      | oxc 已有**实验性** Compiler 支持（支持 target '18' + runtime 包），骨架期优先验证 oxc 原生通道；不行退 babel 通道；仍不行该 app 退回 `@vitejs/plugin-react`，Compiler 照常用     |
| 11  | 响应壳（interceptor 加）× swagger 类型 × orval 生成物三方不对齐 | swagger 保持**裸类型**（不写壳）；orval mutator 指定自定义 ky 实例、在 mutator 内剥壳返回内层 data——后端加壳、ky 剥壳、orval 类型 = 裸 data 正好对上；骨架期第一个接口就打通验证 |

## 8. 本机环境（2026-07-29 探测）

| 项                 | 状态                       |
| ------------------ | -------------------------- |
| Node               | v22.19.0 ✓                 |
| pnpm               | 10.26.2 ✓                  |
| Docker             | 29.2.1 ✓                   |
| git                | 2.51.1 ✓                   |
| MySQL / Redis 本机 | 未装 → 全走 Docker Compose |

## 9. 推进顺序

1. **骨架**：git init → pnpm workspace + 根级工程化（§4 全套）→ docker-compose
2. **后端**：auth + user/role/permission（RBAC 核心学习价值）→ product/order/activity → common 横切（logger/mail/redis/excel）→ schedule/上传；**swagger 装饰器从第一个模块就写全**
3. **契约链路**：openapi.json 导出 → orval 配置 → 生成产物打通
4. **前端**：脚手架（TanStack Router + Query + Jotai 骨架、ky 封装、Devtools）→ 登录 → 权限管理四件套 → 业务页面 → 首页看板
5. **收尾**：websee 接入（可砍）→ crawler 模块（可砍）
6. **二期备选**：packages/ 立共享包（当前共享类型需求已被 orval 覆盖，仅当出现非 API 类共享逻辑时启用）

## 10. 参考

- [Vite+ 文档](https://viteplus.dev/) ｜ [vp check](https://viteplus.dev/guide/check) ｜ [Vite+ Beta 公告](https://voidzero.dev/posts/announcing-vite-plus-beta)
- [一文搞定前端请求（知乎）](https://zhuanlan.zhihu.com/p/1970262111033754347) — 状态三分法思路来源
- [Nest 通关秘籍 · 单 token 无限续期](https://juejin.cn/book/7226988578700525605/section/7398364950944546831) — 认证滑动续期方案来源
- 原仓库见 §1 表格
