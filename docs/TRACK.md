# 项目跟踪（TRACK）

> 单一入口掌握**接续点 / 进度 / 时间投入 / 临场决策**；每个工作 session 结束时更新本文件。
> 姊妹篇：[ISSUES.md](./ISSUES.md)（问题与坑）｜ [LEARNED.md](./LEARNED.md)（学习收获与面试素材）｜ [PLAN.md](./PLAN.md)（开工前决策，只在大方向变化时修订）

**最后更新**：2026-08-27

## NOW（会话接续点）

- **当前阶段**：4 前端（PLAN §9.4）**进行中**——脚手架收口（文件路由 + React Compiler + §5.4 依赖齐）+ 登录/守卫/滑动续期闭环已上线（10 项浏览器矩阵）
- **下一步**：权限四件套——ProLayout 壳 + 静态路由表 × 权限点过滤菜单 + beforeLoad 无权 403 + `<Permission>` 组件/usePermission；临时首页 `_authenticated/index.tsx` 届时替换
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

### 2 后端 ✅（2026-07-30 ~ 07-31）

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
- [x] product：CRUD + updateStatus 上下架 + hot-list（复刻口径：已上架按更新时间倒序前 10，原表无销量字段）+ 被订单/活动引用拒删；decimal 列 transformer 转 number
- [x] order：下单（须已上架、快照冗余字段、整数分位乘法防浮点误差、事务写 order_product）+ 状态机（0→1/0→2/1→2，取消终态）+ detail 组装商品 + 删除事务清关联表
- [x] activity：CRUD + 时间窗校验（end>start、商品存在性）+ 状态按时间窗推导（create/edit 均重推）
- [x] 实测矩阵 32 项：金额 76.5/67.32、状态机非法流转 400、引用拒删 400、test1 按钮码正向（hot-list/删活动）反向（product/order/activity 403）、order_product 零孤儿
- [x] common 横切：winston 统一 logger + 请求摘要日志（middleware，守卫 401/403 出口全覆盖，密码/验证码/token 不落日志）、全局 RedisModule（keyPrefix `store:`）+ health redis 探针、MailModule（未配 SMTP 降级 jsonTransport）
- [x] 忘记密码闭环（mail×redis 用例）：/auth/captcha（crypto 6 位码、TTL 300s、冷却 60s）+ /auth/resetPassword（错 5 次销毁、一次性使用）
- [x] 实测矩阵 35 项：redis TTL 实查（300s/前缀）、错次销毁分支文案、新旧密码轮换、日志敏感信息零命中、401 守卫出口日志在场
- [x] schedule/上传：POST /upload/image（multer diskStorage、uuid+mimetype 白名单映射落盘名、2MB 流式限制）+ serve-static /uploads 公开访问；POST /product/import（exceljs、行级错误一次性收集、全对才入库单事务）；activity 状态每分钟对账（@nestjs/schedule 修正落库快照漂移，SQL 传 JS now 规避容器 UTC 时区分裂）
- [x] 实测矩阵 22 项：上传 201/400/413/403、无 token 直读图片、路径穿越拦截、导入 3 行入库/错行整体回绝零入库/表头与假 xlsx 400、cron 实等一轮修正漂移且不误伤未漂移行、对账日志落盘

### 3 契约链路 ✅（2026-07-31）

- [x] 后端契约出口：swagger 构建抽 `src/swagger.ts`（main.ts 运行时文档与 export-openapi.ts 导出同源，永不漂移）；`pnpm --filter backend openapi` 导出 openapi.json（32 路径/30 schema，裸类型带 required，需 docker 在线）
- [x] 前端最小脚手架：React 18 锁版 + Vite（strictPort 5173、/api proxy、@ 别名）+ TanStack Query + ky；完整依赖清单（Router/jotai/antd）留前端阶段
- [x] orval 打通：tags-split 按 @ApiTags 拆 9 模块进 `src/apis/generated/`（进 git 不手改）；ky mutator 统一剥壳 + ApiError(code/message/detail) 归一化，字段级 400 数组存 detail 供表单回填
- [x] 浏览器实测：health query 裸 data 直出（db/redis up）、login mutation 返回类型化 LoginVo、错密码 ApiError(401) 文案归一；typecheck 一次全绿

### 4 前端 ⏳ 进行中（脚手架 ✅ → 登录 ✅ → 权限四件套 → 业务页 → 看板）

- [x] 脚手架收口：TanStack Router 文件路由（router-plugin + autoCodeSplitting，routeTree.gen.ts 进 git）、React Compiler（babel 通道 target:'18' + react-compiler-runtime，无压缩产物 grep useMemoCache 实证）、§5.4 依赖补齐（jotai/rxjs/es-toolkit/ahooks/devtools 双件）+ antd 5（锁版）
- [x] 认证闭环：tokenAtom（atomWithStorage getOnInit + 写入口归一 RESET）；ky hooks 三件套——beforeRequest 注 Bearer、afterResponse 收续期头静默替换、401 清 token 跳登录（登录接口自身 401 除外）；`_authenticated` 无路径布局 beforeLoad 守卫
- [x] 登录页（antd Form 双层校验体验层 + CSS Modules 样板）+ 临时首页（currentUser 角色/权限点回显）
- [x] 浏览器矩阵 10 项：未登录重定向、rules 拦空表单、错密码 toast 不跳转、登录跳首页、刷新持久化、已登录访问 /login 弹回、登出、篡改 token 401 自愈回登录、续期替换 localStorage 实证（阈值调大法）、登出 storage 零残留

### 5 收尾 ⏳ 未开始（websee / crawler，可砍）

## 时间线（session 日志；耗时为粗估）

| 日期       | 耗时≈ | 内容                                                                                                                                                | 产出                        |
| ---------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 2026-07-30 | 0.5h  | 骨架期开工：监控文档三件套、git init、workspace、工程化两道闸、docker-compose 起库并验证                                                            | 骨架完成（待提交）          |
| 2026-07-30 | 1h    | 首次提交 + 建远程仓库（aotushi）；后端开工：NestJS 11 脚手架、响应壳/异常/校验全局链路、config Joi、TypeORM 连 3307、health+swagger，起服务实测通过 | 后端骨架上线（feat commit） |
| 2026-07-30 | 1.5h  | 仓库更名 store-web-monorepo（compose 项目名解耦）；auth+RBAC：JWT 登录、全局双守卫、滑动续期、三实体映射，9 项实测 + 续期响应头实证                 | RBAC 核心上线               |
| 2026-07-30 | 1h    | user/role CRUD：注册/分页/编辑/冻结/删除 + 关系整体替换 + 事务清中间表；踩出种子数据真相（超管无按钮码 → userType 旁路；roleId=4 孤儿行）           | CRUD 上线（25 项矩阵）      |
| 2026-07-30 | 1h    | product/order/activity 三业务模块：金额整数分位乘法、订单状态机、活动时间窗推导、引用拒删、decimal transformer、分页基类                            | 业务模块上线（32 项矩阵）   |
| 2026-07-31 | 1h    | common 横切：winston 摘要日志（middleware 全出口）、RedisModule、MailModule（jsonTransport 降级）、忘记密码验证码闭环（三防）                       | 横切层上线（35 项矩阵）     |
| 2026-07-31 | 1h    | schedule/上传：图片上传（随机落盘名+白名单）+ serve-static 公开、excel 导入（行级校验+原子入库）、活动状态每分钟对账（时钟源统一坑）                | 后端阶段收官（22 项矩阵）   |
| 2026-07-31 | 1h    | 契约链路：swagger 同源抽取 + openapi 导出脚本、React18+Vite 最小脚手架、orval 9 模块生成、ky 剥壳 mutator，浏览器三链路实测                         | 契约链路打通（§9.3 收官）   |
| 2026-08-27 | 1h    | 前端开工：文件路由 + React Compiler + §5.4 依赖收口；登录页、beforeLoad 守卫、ky 认证三 hooks（注 token/收续期头/401 分流）                         | 登录闭环上线（10 项矩阵）   |

## 临场决策（开工后新决策 / 与 PLAN 的偏离；大方向变化才回写 PLAN）

| 日期       | 决策                                                                          | 理由                                                                                                 |
| ---------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 2026-07-30 | dev 启动形态：**混合式**——mysql/redis 进 docker 常驻，前后端本机 `pnpm dev`   | HMR/调试直挂；Windows bind mount 文件监听差；生产才全容器                                            |
| 2026-07-30 | MySQL 宿主端口 **3307**（容器内仍 3306）                                      | 本机 mysqld.exe 服务占 3306（ISSUES #1）；不动系统服务                                               |
| 2026-07-30 | 库名沿用原 dump `store_web_project`；compose 内置默认凭据，clone 后零配置可起 | 贴原项目 + 降低上手摩擦；密码可 .env 覆盖                                                            |
| 2026-07-30 | 认证自写 JwtAuthGuard（@nestjs/jwt），**不上 passport** 全家桶                | 代码更薄、原理透明（学习价值）；原项目对照性由表结构与接口路径保证                                   |
| 2026-07-30 | 密码库用 **bcryptjs**（纯 JS）替代 bcrypt（native）                           | pnpm 10 默认拦第三方 build script，native 编译在 Windows 多一层坑；hash 格式 $2a$ 完全兼容种子数据   |
| 2026-07-30 | `currentUser` 不挂权限码（登录即可）；原项目把它挂 UserManage 下              | 低权限角色登录后必须能取到自己的信息与菜单，原配置属实现瑕疵                                         |
| 2026-07-30 | PermissionGuard 增加 **userType=0 超管旁路**                                  | 种子数据实锤：超管角色只挂 8 个页面码，delete:user/freezed:user 反而在服务员身上，唯一自洽解释       |
| 2026-07-30 | 删除接口改语义化 **DELETE /user/:id、/role/:id**（原 GET /delete/:id）        | GET 带副作用违背 HTTP 语义，可被爬虫/预取误触发；/user/edit 等无害路径保持原样以便对照               |
| 2026-07-30 | permission 只读，不做增删改                                                   | 权限点与代码中 @RequirePermission 硬编码同源，运行时改表不改代码只会造成两边漂移                     |
| 2026-07-30 | hot-list 口径：已上架按 updateTime 倒序前 10                                  | 原表无销量字段，原实现口径不可考；取"最近有动作的在售品"为合理近似，字段补齐留待订单统计             |
| 2026-07-30 | 商品被订单/活动引用时**拒删**（400），不做级联/软删                           | 裸表无外键，级联删历史订单不可接受；软删要动表结构（violates synchronize:false 契约）                |
| 2026-07-30 | 订单金额服务端计算：单价快照 × 数量，整数分位乘法                             | 金额绝不信任前端传值；JS 浮点 0.1×3≠0.3，分位取整后再除回是两位小数金额的最小正确解                  |
| 2026-07-31 | 请求摘要日志用 **middleware** 而非 interceptor                                | 守卫 401/403 时 interceptor 根本不执行，res 'finish' 才覆盖全部出口；只落摘要，敏感信息天然不进日志  |
| 2026-07-31 | 邮件未配 SMTP 时降级 jsonTransport 假发送                                     | 本地零配置跑通全流程；验证靠 redis 实查验证码，邮件正文任何模式都不落日志                            |
| 2026-07-31 | 验证码三防：冷却 60s 防刷、错 5 次销毁防暴力、一次性使用                      | 6 位数字码空间仅 10^6，无错次上限可被暴力穷举；统一"错误或已过期"文案不泄露内部状态                  |
| 2026-07-31 | 忘记密码接口名自定（/auth/captcha、/auth/resetPassword）                      | 原项目该功能实现不可考；邮箱枚举取明确 404 便于调试，生产应统一话术防枚举（LEARNED 有记）            |
| 2026-07-31 | excel 从 common 挪到 schedule/上传轮一起做                                    | exceljs 无落点接口（/product/import）就没有验证价值，空壳模块不如不立                                |
| 2026-07-31 | 落盘文件名 100% 服务端生成：uuid + mimetype→扩展名白名单映射                  | 原始文件名只当展示数据，一次性防路径穿越/双扩展/特殊字符；非白名单 mimetype 在 fileFilter 即 400     |
| 2026-07-31 | /uploads 走 serve-static 公开访问（不过全局守卫）                             | 商品图要前台展示，公开是特性；写入口 /upload/image 挂 ProductManage（import 同，原表挂 Home 属瑕疵） |
| 2026-07-31 | excel 导入全对才入库：行级错误一次性收集，任一行错整体 400                    | 半截导入让用户对不上账；save(数组) 单事务天然原子，错误数组风格对齐 ValidationPipe                   |
| 2026-07-31 | 活动对账 SQL 传 JS Date 参数而非 SQL NOW()                                    | 容器 mysqld 是 UTC、应用写入按本机时区，NOW() 对比落库时间判定全错；与 deriveStatus 同一时钟源       |
| 2026-07-31 | multer 显式声明为 backend 直接依赖（platform-express 已传递携带 2.2.0）       | 显式 import 的包必须显式声明：pnpm 严格隔离下 phantom dependency 编译期被 @types 掩盖、运行期才炸    |
| 2026-07-31 | swagger 文档构建抽 `src/swagger.ts` 共享（运行时 /api-docs 与导出脚本同用）   | 两处各建一份迟早漂移；契约的单一事实来源必须物理上只有一个构建入口                                   |
| 2026-07-31 | openapi.json 与 orval 产物都进 git（.prettierignore 排除生成物）              | 契约演进靠 commit diff review（PLAN §7#9）；生成物不 lint 不手改，重新生成即覆盖                     |
| 2026-07-31 | 契约阶段即立前端最小脚手架（React18+Query+ky，Router/antd 留 §9.4）           | orval 产物要能 typecheck + 浏览器实调才算打通；只导出 json 不消费等于没验证                          |
| 2026-07-31 | 失败壳在 mutator 压成 ApiError(code/message/detail)                           | Query onError 只认一种错误形状；字段级 400 数组保留在 detail 供表单回填（PLAN §5.6 双层校验）        |
| 2026-08-27 | antd 锁 5.x（6 已发布，pnpm 默认拉到 ^6）                                     | PLAN 按 5 拍板（React18 支持区间/主题 token）；pro-components 生态按 5 配套；升 6 是独立换代不顺带   |
| 2026-08-27 | React Compiler 走 @vitejs/plugin-react 的 babel 插件通道                      | 脚手架是 vite7+plugin-react（非 Vite+ rolldown），§7#10 的 oxc 实验通道不适用，babel 是官方支持路径  |
| 2026-08-27 | 401 语义分流在 ky afterResponse 统一裁决                                      | 登录接口 401=密码错交表单；其余 401=登录态失效清 token 硬跳 /login；无 refresh 接口无重放队列        |
| 2026-08-27 | 路由守卫只判 token 存在性，不发请求验有效性                                   | beforeLoad 同步零开销；伪造/过期 token 由后端 401 + ky hook 兜底自愈，避免每次导航都打 currentUser   |
