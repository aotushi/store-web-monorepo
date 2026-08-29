# 项目跟踪（TRACK）

> 单一入口掌握**接续点 / 进度 / 时间投入 / 临场决策**；每个工作 session 结束时更新本文件。
> 姊妹篇：[ISSUES.md](./ISSUES.md)（问题与坑）｜ [LEARNED.md](./LEARNED.md)（学习收获与面试素材）｜ [PLAN.md](./PLAN.md)（开工前决策，只在大方向变化时修订）

**最后更新**：2026-08-29

## NOW（会话接续点）

- **当前阶段**：5 工程化收尾 **✅ 三实项落地**——`pnpm check` 接入 vp check（fmt+lint+type 三合一，§4.3 完整形态）、CI 补 test/build、manualChunks 分包收 1MB 警告（websee/crawler 按 PLAN 砍掉）
- **下一步**：剩余挂账择做——后端自动化测试（Jest）、seed 商品图 404、fresh-clone husky prepare 验证；或直接进入收官整理（README/面试素材梳理）
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
- [x] `pnpm check` 接入 `vp check`（2026-08-29：fmt+lint+type 三合一 ~1.9s，根 vite.config 开 tsgolint；见 §5）
- [x] CI 补 test/build 步骤（2026-08-29：check → vitest → 双端 build，编译不依赖 docker 服务）
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

### 4 前端 ✅（2026-08-27 ~ 08-29：脚手架 → 登录 → 权限四件套 → 业务页 ×5 → 首页看板）

- [x] 脚手架收口：TanStack Router 文件路由（router-plugin + autoCodeSplitting，routeTree.gen.ts 进 git）、React Compiler（babel 通道 target:'18' + react-compiler-runtime，无压缩产物 grep useMemoCache 实证）、§5.4 依赖补齐（jotai/rxjs/es-toolkit/ahooks/devtools 双件）+ antd 5（锁版）
- [x] 认证闭环：tokenAtom（atomWithStorage getOnInit + 写入口归一 RESET）；ky hooks 三件套——beforeRequest 注 Bearer、afterResponse 收续期头静默替换、401 清 token 跳登录（登录接口自身 401 除外）；`_authenticated` 无路径布局 beforeLoad 守卫
- [x] 登录页（antd Form 双层校验体验层 + CSS Modules 样板）+ 临时首页（currentUser 角色/权限点回显）
- [x] 浏览器矩阵 10 项：未登录重定向、rules 拦空表单、错密码 toast 不跳转、登录跳首页、刷新持久化、已登录访问 /login 弹回、登出、篡改 token 401 自愈回登录、续期替换 localStorage 实证（阈值调大法）、登出 storage 零残留
- [x] 权限内核 `src/permission/`：can()（userType=0 旁路与后端 PermissionGuard 同语义）+ requireCode()（无权 throw redirect /403）+ filterMenu（静态菜单树 × 权限点：叶子看自身码、目录看子项联动）+ `<Permission>`/usePermission 按钮级双形态
- [x] ProLayout mix 壳进 `_authenticated` 布局路由：beforeLoad ensureQueryData 预取 currentUser 进 Query 缓存 + 路由 context（子路由守卫/组件共享零重复请求）；menuItemRender 挂 router Link、受控 location、登出下拉
- [x] 7 张占位页（beforeLoad requireCode）+ /403 落点 + 首页改权限演示页（页面守卫豁免、菜单仍按 Home 码过滤）；vitest 落地纯逻辑必测（PLAN §5.7）：can/filterMenu 6 用例贴种子数据形状
- [x] 浏览器矩阵双账号：超管全菜单 5 顶级项 + 旁路三按钮全见 + /system/user 200；服务员菜单仅 首页+商品管理>热销商品、delete:role fallback 呈现、/system/user 与 /order → 403、/product/hot 放行、403 回首页正常
- [x] 业务页 CRUD 样板（用户管理，PLAN §5.6）：validateSearch 归一化 page/pageSize/username 进 URL（默认值不进）、完全受控 ProTable × useUserControllerList（keepPreviousData）、新建（复用开放注册）/编辑（RoleManage 门控角色下拉）/冻结解冻/删除（Popconfirm+末页回退）、行内 `<Permission>` 正式用法 + isSelf 禁自冻自删、applyFieldErrors 把后端 400 字段级数组回填 antd 表单（vitest 4 用例，累计 10）
- [x] 浏览器矩阵：搜索/重置/直链回填/翻页/pageSize 全走 URL 且刷新可恢复；33 字用户名后端 400 精准回填字段下方；创建→列表失效重取；编辑落库跨重启验证（email+角色 Tag 回显）；冻结↔解冻状态翻转；?username=e2e&page=2 删除唯一行自动回第 1 页；test1 直访 /system/user → /403；e2e 数据清理恢复 5 用户基线
- [x] 角色管理页（样板首次复用）：role/list 无分页无筛选 → 不硬造 URL 状态；权限树勾选 PermissionTreeField（自定义表单控件 value/onChange 约定，checkStrictly 精确授权，PermissionManage 双门控字段渲染+请求）；buildPermissionTree 纯函数（孤儿挂根兜底，vitest 4 用例，累计 14）；内置角色可编辑禁删；删除 Popconfirm 带级联警示（用户将失去该角色）
- [x] 浏览器矩阵：4 种子角色渲染（权限点数/内置 Tag）；编辑超管树 18 节点全展开、8 个页面码精确回显不联动子按钮码；建 e2e_role_mgr（仅 RoleManage+PermissionManage）→ 重名 409 toast → 编辑整体替换 1→2 个；建 e2e_mgr 挂角色后登录实证——菜单仅 系统管理>角色/权限管理、5 行删除按钮全隐藏（`<Permission>`）、树字段可见；内置角色删除 disabled；清理回 4 角色基线
- [x] 商品域（四码门控首例）：页面码 ProductList 只开门，新建/编辑/导入挂 ProductManage、上下架挂 updateStatus:product、删除挂 delete:product；status 枚举含 0 → parseStatus 收口 URL/表单双来源成 0|1|2 字面量；ImageUploadField 自定义控件（上传预览/移除，删图提交空串贴 PATCH 语义）；创建弹窗不放 status；导入行级 400（[{row,errors[]}]）Modal 逐行呈现、字符串 detail 走 toast；热销页只读 top10；契约三缺口在后端补齐再生成——UploadResultVo/ImportResultVo（multipart 端点原生成 void）、images 显式 type:String（string|null 联合反射成 object）、mutator 按 FormData 分流 body/json 并丢弃 orval 硬编码的无 boundary multipart 头
- [x] 浏览器矩阵：5 种子渲染（¥格式/状态 Tag/图占位）；?status=0 直链回填不被 falsy 吞、选已上架提交 → ?status=1；名称模糊 + 重置清 URL；创建带真图上传（uuid 落盘 + 预览 + 移除按钮）；编辑回显改价图不动、移除图片落库空串（响应实证 images:""）；上下架 0→1→2 三态翻转；订单引用拒删 400 toast + 清引用后删净；导入成功 2 条 / 行级错误 Modal 三行齐全且好行未入库 / 表头不符 toast；热销 3 条按更新时间倒序无搜索无分页；test1 天然用例——/product 403、/product/hot 200、菜单只剩热销；临时授 ProductList 实证 7 行渲染但操作列全空工具栏零按钮（四码分离决定性证据）；清理回 5 商品基线
- [x] 订单管理页（三码形态）：OrderManage 一码兼页面+下单+列表+详情（无独立页面码，与商品四码成对比），状态流转挂 cancel:order（付款/取消共用）、删除挂 delete:order；状态机按钮条件渲染镜像后端 ORDER_TRANSITIONS（0→付款/取消、1→仅取消、2 终态）；下单弹窗只列已上架商品（pageSize 100 上限口径）+ 整数分位金额预览（权威值后端算，请求体无金额字段）；详情抽屉快照对比（当前单价×数量≠订单价 → "与下单时不同"Tag）+ 商品已删防御分支；契约缺口 Order.desc 补显式 type:String（同 images 坑）再生成
- [x] 浏览器矩阵：空表首屏 10 列齐；下单预览 ¥60.00/折后 ¥52.80 与服务端返回一致（烧鸭×3×0.88）、Select 恰列 3 已上架品；?status=0&name=烧 直链回显 + 过滤 2 条、重置清 URL、提交 → ?status=1 空列表；状态机三条边实操（0→1 付款后按钮收敛、0→2、1→2 终态只剩详情+删除）；详情抽屉 9+3 字段全、调价 26→30 实证快照 Tag（订单价 ¥52 不动）、SQL 脏单实证"商品已删除"分支；删除事务清 order_product（orderId=3 关联行随删、他单无损）；下架竞态提交 → 400"商品未上架"toast 弹窗保持；test1 天然 403 + 菜单无订单；临时授 OrderManage 决定性证据——进页 + 新建订单可见 + 行内仅详情，接口层同构（create 201 / updateOrder 403 / delete 403）；清理回零订单基线
- [x] 活动管理页（两码形态，唯一零契约缺口切片）：ActivityManage 一码兼页面+创建+列表+编辑（新建/编辑按钮均不包 `<Permission>`），仅删除挂 delete:activity；状态是时间窗推导的落库快照（只读呈现，编辑成功 toast 带后端重推结果）；时间窗单 RangePicker(showTime) 字段提交拆 startTime/endTime ISO、回显组 dayjs 对；商品下拉列全量含未上架（后端 create/edit 只校验存在性，与订单弹窗"仅已上架"成口径对照）；productId 列复用弹窗商品查询映射名称；前端不复刻 end>start 留后端 400 字符串 detail → toast 实测口；dayjs 补为前端直接依赖（pnpm 严格布局下 antd 传递依赖不可 import）
- [x] 浏览器矩阵：空态 8 列齐；跨 now 窗创建 → 进行中、未来窗 → 未开始（推导实证）、拼团 Tag、未上架商品（烧排骨）创建成功、desc 留空落 ''；SQL 复核落库（status/desc_len/时间/productId 全对）；?status=1 直链回显+过滤、组合过滤（status 残留+name=拼 → 空态）、重置全清；编辑回显全五字段（RangePicker dayjs 重组、商品 label）、改窗到过去 → toast「已保存（已结束）」+ 行状态重推导；end==start → 400 字符串 detail toast 弹窗保持；test1 天然 403（持 delete:activity 但无页面码）→ 授 ActivityManage 后**悬空删除码自动激活**（新建/编辑/删除三按钮齐见，两码形态决定性证据）；接口层正交性——授权期 create 201/edit 200（只传 name 部分更新实证），revoke 后 create 403 而 **DELETE 仍 200**（操作码独立于页面码生效，前端门控只是 UX 遮罩非安全边界）；UI Popconfirm 删净回空基线、权限表恢复 5 条原状

- [x] 首页看板（阶段 4 收官切片，唯一"先补后端再做前端"切片）：后端新增只读 stats 模块——GET /stats/overview 挂 Home 码（复用不新造权限点），嵌套 VO 显式类声明（counts/orderStatus/revenue/trend）防 orval 退化；日界沿用时钟源决策（JS 本地算边界传参，不用 SQL CURDATE()），近 7 日趋势 SQL 只按窗口起点取行、JS 分桶缺日补零，decimal SUM 字符串 Number() 收口；前端首页重写为看板——页面守卫仍豁免（"登录成功即 403"死角决策不动），门控下沉数据层：无 Home 渲染降级卡且 query enabled=false 零请求，有码才拉聚合；四统计卡 + 营收卡 + 状态分布 + 手写 CSS 柱状图（7 根柱不引图表库，柱高按 max 换算固定像素避开 flex 列百分比陷阱）
- [x] 浏览器矩阵：空库基线（counts 5/5/3、7 天零柱、营收 0）；跨日 fixtures 6 单实证聚合——日界归属（昨夜 23:30 → 28 日、今晨 00:30 → 29 日）、营收口径（total 含窗口外 ¥1000、today 只算今日 paid、cancelled/unpaid 计单不计钱）、柱高比例（2 单满高/1 单半高/0 单兜底 2px）；curl 权限矩阵 200/403/200；test1 撤 Home 浏览器实证——菜单"首页"消失、降级卡呈现、**0 次 /stats 请求**（enabled 双闸决定性证据），恢复后 1 次请求 + 看板回归；清理回零订单基线（权限表 5 条原状）

### 5 工程化收尾 ✅（2026-08-29；websee / crawler 按 PLAN 预留砍掉）

- [x] `pnpm check` = `vp check` + prettier --check（§4.3 完整形态）：根 vite.config.ts 开 `lint.options.typeAware/typeCheck`，一条命令 fmt+lint+type（tsgolint/TS7）~1.9s；`pnpm format` 对称接 `vp check --fix`
- [x] 全仓 oxfmt 格式化落地（114 文件纯格式 commit 单独隔离）；`.prettierignore` 补 routeTree.gen.ts（vp/oxfmt 同读此文件）
- [x] tsgolint 兼容改造：后端 tsconfig 显式 rootDir / 删除已废弃 baseUrl / 显式 `strictPropertyInitialization: false`（tsgo 默认值与 tsc 不同，否则 128 个假 TS2564）
- [x] type-aware 告警清零：mutator query 序列化 primitive 白名单、excel cellText 收窄（对齐纯文本契约）、订单详情 entity 展开有意为之行内豁免
- [x] CI 补全：check → 前端 vitest → 后端 build → 前端 build（纯编译，CI 无需 docker）
- [x] manualChunks：react/tanstack 两个干净 vendor 拆出（入口 580KB→~320KB）；antd 生态实验性手切必产循环 chunk 且仍超线 → 显式 chunkSizeWarningLimit 1100 接受（Table 链路 min ~1MB / gzip 322KB）；vite preview 补同源 proxy 用于产物验证
- [x] 验证：双端 tsc 绿、nest dist 布局不变、vitest 14 绿、前端 build 零警告、生产产物浏览器冒烟（看板/列表/搜索 query 序列化/仅剩已知 seed 图 404）

## 时间线（session 日志；耗时为粗估）

| 日期       | 耗时≈ | 内容                                                                                                                                                | 产出                         |
| ---------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 2026-07-30 | 0.5h  | 骨架期开工：监控文档三件套、git init、workspace、工程化两道闸、docker-compose 起库并验证                                                            | 骨架完成（待提交）           |
| 2026-07-30 | 1h    | 首次提交 + 建远程仓库（aotushi）；后端开工：NestJS 11 脚手架、响应壳/异常/校验全局链路、config Joi、TypeORM 连 3307、health+swagger，起服务实测通过 | 后端骨架上线（feat commit）  |
| 2026-07-30 | 1.5h  | 仓库更名 store-web-monorepo（compose 项目名解耦）；auth+RBAC：JWT 登录、全局双守卫、滑动续期、三实体映射，9 项实测 + 续期响应头实证                 | RBAC 核心上线                |
| 2026-07-30 | 1h    | user/role CRUD：注册/分页/编辑/冻结/删除 + 关系整体替换 + 事务清中间表；踩出种子数据真相（超管无按钮码 → userType 旁路；roleId=4 孤儿行）           | CRUD 上线（25 项矩阵）       |
| 2026-07-30 | 1h    | product/order/activity 三业务模块：金额整数分位乘法、订单状态机、活动时间窗推导、引用拒删、decimal transformer、分页基类                            | 业务模块上线（32 项矩阵）    |
| 2026-07-31 | 1h    | common 横切：winston 摘要日志（middleware 全出口）、RedisModule、MailModule（jsonTransport 降级）、忘记密码验证码闭环（三防）                       | 横切层上线（35 项矩阵）      |
| 2026-07-31 | 1h    | schedule/上传：图片上传（随机落盘名+白名单）+ serve-static 公开、excel 导入（行级校验+原子入库）、活动状态每分钟对账（时钟源统一坑）                | 后端阶段收官（22 项矩阵）    |
| 2026-07-31 | 1h    | 契约链路：swagger 同源抽取 + openapi 导出脚本、React18+Vite 最小脚手架、orval 9 模块生成、ky 剥壳 mutator，浏览器三链路实测                         | 契约链路打通（§9.3 收官）    |
| 2026-08-27 | 1h    | 前端开工：文件路由 + React Compiler + §5.4 依赖收口；登录页、beforeLoad 守卫、ky 认证三 hooks（注 token/收续期头/401 分流）                         | 登录闭环上线（10 项矩阵）    |
| 2026-08-27 | 1h    | 权限四件套：can/requireCode/filterMenu/`<Permission>` + ProLayout 壳（context 预取 currentUser）+ 7 占位页 + vitest 6 用例；双账号浏览器矩阵        | 权限四件套上线               |
| 2026-08-28 | 1.5h  | 业务页 CRUD 样板（用户管理）：URL 驱动受控 ProTable、四操作全链路、双层校验 400 回填实测（33 字用户名）、末页删除回退、applyFieldErrors + vitest    | CRUD 样板上线（feat commit） |
| 2026-08-28 | 1h    | 角色管理页：样板首次复用 + 权限树勾选（checkStrictly/双门控/挂载时机）、buildPermissionTree + vitest；自建角色挂用户端到端实证按钮级门控            | 角色页上线（feat commit）    |
| 2026-08-28 | 1.5h  | 商品域：列表页四码门控 + 图片上传控件 + excel 导入三分支 + 热销只读页；契约三缺口后端补齐（VO×2 / images 显式 String / mutator FormData 分流）      | 商品页上线（feat commit）    |
| 2026-08-28 | 1h    | 订单页：三码门控 + 状态机按钮条件渲染 + 快照对比抽屉 + 竞态 400 实证；desc 契约缺口同坑复现即修；决定性证据升级到接口层同构验证                     | 订单页上线（feat commit）    |
| 2026-08-28 | 1h    | 活动页：两码门控 + 时间窗推导呈现 + RangePicker 拆合 ISO + 悬空按钮码/接口码正交性双实证；零契约缺口切片；rc-picker 自动化交互踩坑改走数据层        | 活动页上线（feat commit）    |
| 2026-08-29 | 1h    | 首页看板：后端 stats 聚合模块（Home 码复用、JS 日界分桶、嵌套 VO）+ 前端看板重写（数据层双闸门控、手写 CSS 柱状图）；跨日 fixtures 实证聚合口径     | 阶段 4 收官（feat commit）   |
| 2026-08-29 | 1.5h  | 阶段 5 收尾：vp check 三合一接入（tsgolint 默认值差异排雷 128 假报）、全仓 oxfmt、type-aware 清零、CI 补 test/build、manualChunks 实验与显式提线    | 阶段 5 收官（4 commits）     |

## 临场决策（开工后新决策 / 与 PLAN 的偏离；大方向变化才回写 PLAN）

| 日期       | 决策                                                                             | 理由                                                                                                                      |
| ---------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-30 | dev 启动形态：**混合式**——mysql/redis 进 docker 常驻，前后端本机 `pnpm dev`      | HMR/调试直挂；Windows bind mount 文件监听差；生产才全容器                                                                 |
| 2026-07-30 | MySQL 宿主端口 **3307**（容器内仍 3306）                                         | 本机 mysqld.exe 服务占 3306（ISSUES #1）；不动系统服务                                                                    |
| 2026-07-30 | 库名沿用原 dump `store_web_project`；compose 内置默认凭据，clone 后零配置可起    | 贴原项目 + 降低上手摩擦；密码可 .env 覆盖                                                                                 |
| 2026-07-30 | 认证自写 JwtAuthGuard（@nestjs/jwt），**不上 passport** 全家桶                   | 代码更薄、原理透明（学习价值）；原项目对照性由表结构与接口路径保证                                                        |
| 2026-07-30 | 密码库用 **bcryptjs**（纯 JS）替代 bcrypt（native）                              | pnpm 10 默认拦第三方 build script，native 编译在 Windows 多一层坑；hash 格式 $2a$ 完全兼容种子数据                        |
| 2026-07-30 | `currentUser` 不挂权限码（登录即可）；原项目把它挂 UserManage 下                 | 低权限角色登录后必须能取到自己的信息与菜单，原配置属实现瑕疵                                                              |
| 2026-07-30 | PermissionGuard 增加 **userType=0 超管旁路**                                     | 种子数据实锤：超管角色只挂 8 个页面码，delete:user/freezed:user 反而在服务员身上，唯一自洽解释                            |
| 2026-07-30 | 删除接口改语义化 **DELETE /user/:id、/role/:id**（原 GET /delete/:id）           | GET 带副作用违背 HTTP 语义，可被爬虫/预取误触发；/user/edit 等无害路径保持原样以便对照                                    |
| 2026-07-30 | permission 只读，不做增删改                                                      | 权限点与代码中 @RequirePermission 硬编码同源，运行时改表不改代码只会造成两边漂移                                          |
| 2026-07-30 | hot-list 口径：已上架按 updateTime 倒序前 10                                     | 原表无销量字段，原实现口径不可考；取"最近有动作的在售品"为合理近似，字段补齐留待订单统计                                  |
| 2026-07-30 | 商品被订单/活动引用时**拒删**（400），不做级联/软删                              | 裸表无外键，级联删历史订单不可接受；软删要动表结构（violates synchronize:false 契约）                                     |
| 2026-07-30 | 订单金额服务端计算：单价快照 × 数量，整数分位乘法                                | 金额绝不信任前端传值；JS 浮点 0.1×3≠0.3，分位取整后再除回是两位小数金额的最小正确解                                       |
| 2026-07-31 | 请求摘要日志用 **middleware** 而非 interceptor                                   | 守卫 401/403 时 interceptor 根本不执行，res 'finish' 才覆盖全部出口；只落摘要，敏感信息天然不进日志                       |
| 2026-07-31 | 邮件未配 SMTP 时降级 jsonTransport 假发送                                        | 本地零配置跑通全流程；验证靠 redis 实查验证码，邮件正文任何模式都不落日志                                                 |
| 2026-07-31 | 验证码三防：冷却 60s 防刷、错 5 次销毁防暴力、一次性使用                         | 6 位数字码空间仅 10^6，无错次上限可被暴力穷举；统一"错误或已过期"文案不泄露内部状态                                       |
| 2026-07-31 | 忘记密码接口名自定（/auth/captcha、/auth/resetPassword）                         | 原项目该功能实现不可考；邮箱枚举取明确 404 便于调试，生产应统一话术防枚举（LEARNED 有记）                                 |
| 2026-07-31 | excel 从 common 挪到 schedule/上传轮一起做                                       | exceljs 无落点接口（/product/import）就没有验证价值，空壳模块不如不立                                                     |
| 2026-07-31 | 落盘文件名 100% 服务端生成：uuid + mimetype→扩展名白名单映射                     | 原始文件名只当展示数据，一次性防路径穿越/双扩展/特殊字符；非白名单 mimetype 在 fileFilter 即 400                          |
| 2026-07-31 | /uploads 走 serve-static 公开访问（不过全局守卫）                                | 商品图要前台展示，公开是特性；写入口 /upload/image 挂 ProductManage（import 同，原表挂 Home 属瑕疵）                      |
| 2026-07-31 | excel 导入全对才入库：行级错误一次性收集，任一行错整体 400                       | 半截导入让用户对不上账；save(数组) 单事务天然原子，错误数组风格对齐 ValidationPipe                                        |
| 2026-07-31 | 活动对账 SQL 传 JS Date 参数而非 SQL NOW()                                       | 容器 mysqld 是 UTC、应用写入按本机时区，NOW() 对比落库时间判定全错；与 deriveStatus 同一时钟源                            |
| 2026-07-31 | multer 显式声明为 backend 直接依赖（platform-express 已传递携带 2.2.0）          | 显式 import 的包必须显式声明：pnpm 严格隔离下 phantom dependency 编译期被 @types 掩盖、运行期才炸                         |
| 2026-07-31 | swagger 文档构建抽 `src/swagger.ts` 共享（运行时 /api-docs 与导出脚本同用）      | 两处各建一份迟早漂移；契约的单一事实来源必须物理上只有一个构建入口                                                        |
| 2026-07-31 | openapi.json 与 orval 产物都进 git（.prettierignore 排除生成物）                 | 契约演进靠 commit diff review（PLAN §7#9）；生成物不 lint 不手改，重新生成即覆盖                                          |
| 2026-07-31 | 契约阶段即立前端最小脚手架（React18+Query+ky，Router/antd 留 §9.4）              | orval 产物要能 typecheck + 浏览器实调才算打通；只导出 json 不消费等于没验证                                               |
| 2026-07-31 | 失败壳在 mutator 压成 ApiError(code/message/detail)                              | Query onError 只认一种错误形状；字段级 400 数组保留在 detail 供表单回填（PLAN §5.6 双层校验）                             |
| 2026-08-27 | antd 锁 5.x（6 已发布，pnpm 默认拉到 ^6）                                        | PLAN 按 5 拍板（React18 支持区间/主题 token）；pro-components 生态按 5 配套；升 6 是独立换代不顺带                        |
| 2026-08-27 | React Compiler 走 @vitejs/plugin-react 的 babel 插件通道                         | 脚手架是 vite7+plugin-react（非 Vite+ rolldown），§7#10 的 oxc 实验通道不适用，babel 是官方支持路径                       |
| 2026-08-27 | 401 语义分流在 ky afterResponse 统一裁决                                         | 登录接口 401=密码错交表单；其余 401=登录态失效清 token 硬跳 /login；无 refresh 接口无重放队列                             |
| 2026-08-27 | 路由守卫只判 token 存在性，不发请求验有效性                                      | beforeLoad 同步零开销；伪造/过期 token 由后端 401 + ky hook 兜底自愈，避免每次导航都打 currentUser                        |
| 2026-08-27 | 菜单目录显隐由子项联动，目录自身码不作门槛                                       | 种子实锤：服务员挂 HotProductList 却无 ProductManage 目录码，超管角色同缺目录码；子项联动唯一自洽                         |
| 2026-08-27 | 前端 can() 复制后端 userType=0 超管旁路                                          | 前后端判定同语义，否则超管（角色仅 8 码）菜单/按钮大面积消失而接口全通，两边表现割裂                                      |
| 2026-08-27 | 首页页面守卫豁免，但菜单里"首页"仍按 Home 码过滤                                 | 登录后固定落地 /，若设门槛则无 Home 码角色（种子 rid3 实况）登录成功即 403 死角                                           |
| 2026-08-27 | currentUser 在布局路由 beforeLoad 用 ensureQueryData 预取                        | 写进 Query 缓存 + 路由 context 双出口，子路由守卫与组件共享同一份，导航零重复请求                                         |
| 2026-08-27 | vitest 随权限切片落地（零独立配置）                                              | PLAN §5.7 纯逻辑必测清单第一项就是权限过滤；复用 vite 配置即跑，6 用例贴种子数据形状                                      |
| 2026-08-28 | 列表状态（page/pageSize/username）全进 URL，默认值不进 URL                       | URL 是唯一事实来源：直链可分享、刷新/回退自然恢复、组件零 useState；validateSearch 归一化脏参数                           |
| 2026-08-28 | ProTable 完全受控（不用 request 自取数，options 关掉）                           | 数据归 TanStack Query（缓存/失效/keepPreviousData），ProTable 只当渲染层；request 模式是第二数据源                        |
| 2026-08-28 | 新建用户复用开放注册接口（不加管理端专用创建）                                   | 复刻口径后端本就无此接口；密码策略/重名校验与注册天然同源，避免两套 DTO 漂移                                              |
| 2026-08-28 | 编辑表单角色下拉按 RoleManage 双门控（字段渲染 + role/list 请求 enabled）        | 仅有 UserManage 的账号打开编辑不该发必 403 的请求；EditUserDto 不传 roleIds = 角色不动，语义正好                          |
| 2026-08-28 | 前端故意不复刻 username 32 字上限规则                                            | 留作双层校验实测口：33 字触发后端 400 字段级数组 → applyFieldErrors 回填表单项，契约闭环有实证                            |
| 2026-08-28 | 删除末页唯一行后主动导航 page-1                                                  | 只靠 invalidate 会停在空页；URL 驱动下改 URL 即改数据，比读响应算最大页薄得多                                             |
| 2026-08-28 | 角色页不做 URL 搜索状态（role/list 无分页无筛选）                                | 接口没有的能力不硬造 URL 状态；样板的 URL 驱动只在"状态本来就该进 URL"时才成立                                            |
| 2026-08-28 | 权限树 checkStrictly（父子勾选不联动）                                           | 授权是精确 id 集合；种子实锤"挂页面码不挂按钮码""按钮挂目录下"，父子联动会在保存时篡改这类集合                            |
| 2026-08-28 | 权限树字段按 PermissionManage 双门控（字段渲染 + permission/list 请求）          | 仅有 RoleManage 的账号打开弹窗不该发必 403 的请求；字段不挂载 → 提交不带 permissionIds = 权限不动                         |
| 2026-08-28 | 内置角色（isSystem=1）编辑放行、删除按钮 disabled 而非隐藏                       | 后端语义即"可编辑禁删"（删除 400 兜底）；disabled 可见比隐藏更能传达"存在但被保护"                                        |
| 2026-08-28 | 权限树数据就绪前不挂 Tree（Spin 占位）                                           | antd defaultExpandAll 只在首次挂载生效，异步数据到达后不补展开；晚挂载一次性解决                                          |
| 2026-08-28 | 契约缺口一律回后端补齐再生成，不做前端 cast                                      | multipart 端点缺 @ApiOkResponse 生成 void、string\|null 联合缺显式 type 生成 object；cast 是类型撒谎                      |
| 2026-08-28 | mutator 按 data instanceof FormData 分流 body/json，并丢弃 orval 的 multipart 头 | ky json 会 stringify FormData；手设 multipart/form-data 无 boundary 必 400，须留给浏览器自动生成                          |
| 2026-08-28 | status 枚举含 0：URL/表单双来源统一 parseStatus 收口成 0\|1\|2 字面量            | falsy 判断会把"未上架"当没筛选；字面量窄化正好对上 orval 生成的参数枚举类型，零断言                                       |
| 2026-08-28 | 图片移除提交空串而非 undefined                                                   | PATCH"不传即不动"：undefined 键被 JSON 序列化丢弃，"删图"会静默变成"没改"                                                 |
| 2026-08-28 | 创建商品弹窗不放 status 字段                                                     | 新品默认未上架；上下架是列表页专用操作，贴后端 edit / updateStatus 接口分工                                               |
| 2026-08-28 | 导入行级 400 用 Modal 逐行呈现，不进 applyFieldErrors                            | [{row,errors[]}] 与字段级 [{field,errors[]}] 同风格不同键，行错误没有对应表单字段可回填                                   |
| 2026-08-28 | 订单页详情/新建按钮不包 `<Permission>`（付款/取消/删除仍包）                     | detail/create 接口码即页面码 OrderManage，进得来页必有码；门控跟接口码走，不为对称而对称                                  |
| 2026-08-28 | 状态机按钮按 record.status 条件渲染，不做置灰                                    | 非法流转对用户不是"暂不可用"而是"不存在的操作"；后端 TRANSITIONS 400 兜底，前端渲染即文档                                 |
| 2026-08-28 | 下单弹窗金额只做前端预览并明示"以后端为准"                                       | 请求体根本没有金额字段（防篡改），预览用同款整数分位算法保证与后端结果一致，不一致即算法漂移信号                          |
| 2026-08-28 | 详情抽屉并列商品当前价 + 快照价，moneyMul 比对打"与下单时不同"Tag                | 快照语义不可见就等于没做；乘法比对必须走整数分位，浮点直乘会把相等误判为不等                                              |
| 2026-08-28 | 活动页新建/编辑按钮均不包 `<Permission>`（仅删除包）                             | 两码形态：create/list/edit 接口码即页面码 ActivityManage；门控粒度是后端接口码分布的投影不自创                            |
| 2026-08-28 | 活动商品下拉列全量（含未上架），不复用订单弹窗的 status:1 过滤                   | 后端 create/edit 只校验商品存在性（findById），下拉口径贴接口口径；预热未上架商品是合法场景                               |
| 2026-08-28 | 时间窗单 RangePicker 字段，提交拆两 ISO 字段、回显组 dayjs 对                    | DTO 是 startTime/endTime 两字段但语义是一个区间；一个控件天然带"成对必填"约束，拆合只在协议边界发生                       |
| 2026-08-28 | 活动状态列只读呈现 + 编辑成功 toast 带后端重推结果                               | status 是时间窗推导的落库快照非用户操作；把"推导"暴露给用户避免"我没改状态它怎么变了"的困惑                               |
| 2026-08-28 | 前端不复刻 end>start 校验                                                        | 双层校验测试口：后端 400 detail 是字符串（非字段数组），实证 errorText → toast 分支；UI 层拦截留后续                      |
| 2026-08-29 | 统计接口挂 Home 码复用，不新造 Dashboard 权限点                                  | 看板与首页同门槛语义；权限点与 @RequirePermission 同源只读，新造码要动种子数据违背复刻口径                                |
| 2026-08-29 | 首页门控下沉数据层：无码渲染降级卡 + query enabled=false                         | 页面守卫豁免决策不动（避免登录即 403 死角），但无 Home 的账号不该发注定 403 的请求；双闸有浏览器实证                      |
| 2026-08-29 | 趋势聚合"SQL 取行 + JS 分桶"，不用 SQL GROUP BY DATE()                           | 容器 mysqld 是 UTC，SQL 侧分日会用错日界；JS 本地算边界与 deriveStatus/对账 cron 同一时钟源                               |
| 2026-08-29 | 营收口径：total 全量 paid、today/trend 只窗口内，cancelled/unpaid 计单不计钱     | 单数反映经营活跃度、钱只认已付款；口径差异用 fixtures（窗口外 ¥1000 大单）实证 total ≠ trend 合计                         |
| 2026-08-29 | 7 根柱手写 CSS 柱状图，不引图表库；柱高换算固定像素上限                          | SIMPLE：单接口一屏可视不值一个 chart 依赖；flex 列内百分比高度受兄弟元素挤压，固定像素换算零陷阱                          |
| 2026-08-29 | tsgolint 默认值差异用"显式化"消解：tsconfig 写明 strictPropertyInitialization    | tsgo（TS7）strict 家族默认开、tsc 默认关，128 个假 TS2564 的根因是工具默认不同而非代码错；显式声明让两套工具读到同一语义  |
| 2026-08-29 | type-aware 告警修代码收窄，不批量豁免；唯一豁免是订单详情 entity 展开            | no-base-to-string 指向的是真实契约缺口（对象值序列化成 [object Object]）；entity spread 拍平是序列化本意，豁免加注释说明  |
| 2026-08-29 | manualChunks 只切 react/tanstack，antd 生态显式提线不硬切                        | 两轮实验：antd/rc-*/icons/pro 按包名任意分组均产生循环 chunk 警告且各块仍超 500KB；gzip 视角 322KB 可接受，提线留注释存证 |
| 2026-08-29 | CI build 步骤纯编译，不起 docker 服务                                            | nest build/vite build 都不连库；把"能编译"与"能运行"分层，后者留给后端自动化测试挂账项                                    |
