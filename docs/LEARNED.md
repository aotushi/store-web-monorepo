# 学习收获（LEARNED）

> 求职线产出：按阶段沉淀**知识点**（原理/坑的通用化）与**面试可讲点**（能撑起 3 分钟讲述的素材）。
> 写入时机：阶段收尾必写；平时遇到值得记的随手追加。

## 骨架期（2026-07-30）

### 知识点

- **compose healthcheck 的 CMD 与 CMD-SHELL 区别**：`CMD` 数组直接 exec 不经 shell，`$VAR` 不展开；要用环境变量（如 `mysqladmin ping -p$MYSQL_ROOT_PASSWORD`）必须 `CMD-SHELL`；compose 文件里 `$$` 转义为字面 `$` 留给容器内 shell 展开
- **mysql 官方镜像初始化契约**：`/docker-entrypoint-initdb.d` 只在**数据卷首次为空**时执行；改了 sql 想重跑要 `docker compose down -v` 删卷再起
- **mysqldump 单库 dump 不含 `CREATE DATABASE`**：建库靠镜像的 `MYSQL_DATABASE` 环境变量，脚本在该库上下文内执行
- **husky 9 本质**：`pnpm exec husky` 只做一件事——`git config core.hooksPath .husky/_`；pnpm 10 下 add 依赖未触发 prepare（待 fresh clone 验证 install 是否触发），不生效就手动挂
- **prettier 分域**：用命令行 glob 限定管辖扩展名（js/ts 留给 Oxfmt）+ `.prettierignore` 排掉 `pnpm-lock.yaml`（它是 yaml，会被误管）
- **Windows 端口占用排查链**：`netstat -ano` 找 PID → `Get-CimInstance Win32_Process -Filter 'ProcessId=N'` 确认进程身份 → 再决定绕行/停服务，不盲杀

### 面试可讲

- **多人协作工程化两道闸设计**：本地 husky 全量 check（仓库从零开始永远干净，工具快到无感所以不需要 lint-staged）+ CI 真门禁（钩子可被 `--no-verify` 绕过）；跨 OS 行尾唯一可靠解是 `.gitattributes` 仓库级强制 LF，而非依赖成员各自的 autocrlf
- **dev/prod 环境形态分治**：dev 混合式（有状态中间件进容器、需要 HMR/断点的应用进程本机跑）、prod 全容器——能讲清 Windows bind mount 文件监听、node_modules 原生依赖跨平台这些"为什么不全容器"的依据

## 后端阶段（2026-07-30 起）

### 知识点

- **TS1272 装饰器签名类型必须 `import type`**：`isolatedModules` + `emitDecoratorMetadata` 同开时，出现在装饰器方法签名里的类型（如 `@CurrentUser() user: JwtPayload`）必须 `import type`——单文件转译器无法判断该 import 是纯类型还是运行时值（metadata 反射需要值）
- **jsonwebtoken 9 的 `expiresIn` 是 ms 模板字面量类型**（`` `${number}h` `` 等 StringValue），`config.get<string>()` 的 `string` 反而不可赋值；格式正确性交 Joi 启动校验，取值处不标泛型即可
- **pnpm 10 默认拦截第三方包 build script**（装 deps 时的 `Ignored build scripts` 警告）：bcrypt（native，需 node-gyp）这类包装完是坏的，除非 `pnpm approve-builds`；bcryptjs 纯 JS 无此问题且 `$2a$` hash 格式互通——原表种子密码直接可验
- **bcrypt 的盐内嵌在 hash 前 29 字符**（`$2a$10$` + 22 字符盐），`compare(plain, hash)` 自取盐；原项目单独存 `salt` 列是冗余设计
- **APP_GUARD 注册顺序即执行顺序**：providers 数组里 JwtAuthGuard 在前、PermissionGuard 在后，后者才能读到前者挂的 `req.user`
- **compose 项目名默认取目录名**：目录更名 → 卷前缀漂移 → 数据"消失"（旧卷成孤儿）；顶层 `name:` 字段锁死解耦
- **Windows 下进程 cwd 会锁目录改名**（EBUSY）：会话工作目录在项目根时，项目根本身改不了名，只能会话外操作；排查时注意 `CommandLine -match` 只是线索，瞬态 shell 会误伤
- **query 参数默认全是 string**：`ValidationPipe({ transform: true })` 只按 DTO 类型实例化，不做隐式转换；数值型 query 字段要 `@Type(() => Number)`（class-transformer）才能过 `@IsInt`
- **TypeORM ManyToMany 的写与删不对称**：`save` 实体上的关系数组会自动 diff 中间表（整体替换语义，load relations → 赋新数组 → save 即可）；但 `delete` 主实体**不级联**中间表——表无外键约束时必须自己在事务里清（`dataSource.transaction` + 原生 SQL），否则留孤儿行
- **种子数据考古两例**：① 原库 role_permission 里躺着 roleId=4 的 4 行孤儿（角色早被删）——实锤原项目删除只删主表不清关系；② 超管角色只挂 8 个页面码、`delete:user`/`freezed:user` 按钮码反而在服务员角色上——唯一自洽解释是原项目按 `userType=0` 旁路超管，权限码只约束普通角色（403 复现 → 查种子 → 反推出隐含设计）
- **mysql decimal 列驱动层返回 string**：TypeORM 不擅自转换（保精度是驱动的正确默认）；业务侧统一用 `ValueTransformer` 的 `from()` 转 number——两位小数金额在 double 的 15~16 位有效数字内安全，千万级以上金额系统才需要 string/BigInt 方案
- **金额乘法整数分位**：`0.1 * 3 === 0.30000000000000004`（IEEE754）；两位小数金额的最小正确解是 `Math.round(a * b * 100) / 100`，实测 76.5 × 0.88 = 67.32 精确落库
- **跨模块引用检查用原生 SQL 而非注入对方 Repository**：product 删除要查 order/activity 引用，注入对方实体仓储会让依赖方向倒转（基础模块反依赖上层业务模块，还可能循环）；`dataSource.query` 只依赖表、不依赖模块
- **Nest 请求管线里 middleware 与 interceptor 的覆盖面差异**：执行序 middleware → guard → interceptor → handler，守卫抛 401/403 时 interceptor 根本不执行；要记录**所有**请求出口（含被守卫拒绝的）只能在 middleware 层挂 `res.on('finish')`——finish 时 statusCode 已定、guard 挂的 `req.user` 也已在场
- **Express 5 路由通配符换语法**：`'*'` 废弃，NestJS 11 下 `forRoutes` 全路由要写 `'{*splat}'`（path-to-regexp v8 语法）
- **验证码必须用 `crypto.randomInt` 而非 `Math.random`**：V8 的 xorshift128+ 可由连续输出逆推内部状态，攻击者观测若干验证码即可预测后续；`randomInt(100000, 1000000)` 上界不含、恒 6 位，一并解决前导零问题
- **ioredis 的 `keyPrefix` 只管"key 参数位"**：get/set/del 等命令的 key 参数自动拼前缀，但 `keys`/`scan` 的 pattern 是普通字符串参数不受管辖——带前缀架构下业务代码禁用 keys，运维排查时要手写全前缀
- **winston-daily-rotate-file 会在日志目录生成 `.audit.json` 元数据**：gitignore 只写 `*.log` 盖不住，要按目录 `logs/` 级忽略
- **nodemailer `jsonTransport` 是天然的本地降级方案**：不出网、sendMail 正常 resolve（返回序列化 JSON），未配 SMTP 时切它即可零配置跑通邮件链路；配合"正文不落日志"约束，验证码取证走 redis 实查而不是翻日志
- **pnpm 严格隔离让 phantom dependency 在运行期而非编译期暴露**：multer 2.2.0 是 @nestjs/platform-express 的传递依赖，代码里显式 `import { diskStorage } from 'multer'`——tsc 通过（-D 装的 @types/multer 提供类型）、`nest build` 绿，`node dist/main.js` 才 MODULE_NOT_FOUND（require 解析不到藏在 `.pnpm` 里的实体包）；npm/yarn hoisting 会静默吞掉这个错误。规则：**显式 import 的包必须显式声明为直接依赖**
- **Nest 文件上传的异常两条路**：multer 的 `LIMIT_FILE_SIZE` 由 FileInterceptor 的 transformException 转成 413（流式中断，不是收完再拒）；`fileFilter` 里 `cb(new BadRequestException(...), false)` 异常原样传播成 400——注意 Nest 声明的 fileFilter 回调类型要求两个参数，裸 multer 惯用的单参 `cb(err)` 编译不过
- **serve-static 挂在 middleware 层 = 全局守卫覆盖不到**：ServeStaticModule 在 Express middleware 链上直接回文件，APP_GUARD 根本不参与——公开商品图是特性，但要意识到"全局守卫"并不真的封死所有 HTTP 出口；路径穿越由底层 send 库自带防护（`..%2F` 编码也会被规范化后拦截）
- **exceljs 读 buffer 两个坑**：① 自带旧版 @types/node，其 `Buffer` 声明与新版本项目冲突（TS2345），按 `Parameters<Workbook['xlsx']['load']>[0]` 断言过桥；② `eachRow` 默认跳空行、`cell.value` 可能是 richText/公式对象，纯文本模板要 `String(value ?? '').trim()` 兜底
- **TypeORM `save(实体数组)` 默认单事务**：多行导入"全对才入库"不需要手写 transaction，任一行失败整体回滚——原子性白拿
- **容器数据库时区分裂**：mysqld 容器默认 UTC、应用/驱动写入按本机时区（+8）——对账 SQL 里用 `NOW()` 会拿 UTC 与本地时间落库值比较，判定全错；把 JS `new Date()` 作参数传进 SQL 才与业务写入同一时钟源。通用原则：跨系统比较时间，时钟源必须唯一

### 面试可讲

- **默认安全的守卫设计**：全局 APP_GUARD + `@Public()` 豁免（漏配 = 多拦，安全兜底）对比逐接口手挂 Guard（漏配 = 裸奔）；鉴权用 `@RequirePermission(code)` 声明式，code 与前端按钮权限点同源一套数据，对比原项目 `permission_api` 表按 url+method 匹配的脆弱性（改路由即失效、`Get`/`GET` 大小写不一致已在种子数据里出现）
- **单 token 滑动续期**：Guard 内检查剩余有效期 < 阈值即重签、新 token 放响应头（配 CORS `exposedHeaders`），前端拦截器静默替换——对比双 token（refresh token）方案：实现简单、无并发刷新竞态，代价是无法服务端吊销单次会话；实测可演示（阈值调大即每请求触发）
- **GET 副作用是真实事故源**：原项目 `GET /user/delete/:id`——GET 可被浏览器预取/爬虫/链接扫描触发，语义上应幂等无副作用；复刻时改语义化 `DELETE`，无害路径（`/user/edit`）保持原样以便对照。能引申讲 REST 方法语义、幂等性、safe method 三个概念的区别
- **无外键表的删除一致性**：原库全部裸表（无 FK），删除必须应用层保证——事务内先清关系表再删主表；对比外键 `ON DELETE CASCADE` 方案的取舍（DB 兜底 vs 迁移灵活/分库友好，互联网大表普遍去外键）；种子里的孤儿行就是不做这件事的后果实证
- **订单三件套设计**：① 冗余商品名/价格是**下单快照**语义（商品后续改名改价不影响历史订单），不是坏设计——但原表把它和关联表混用才是问题；② 状态流转用显式转移表 `{0:[1,2], 1:[2], 2:[]}` 而非 if 链，非法流转一律 400，新增状态只改一处；③ 金额服务端算、绝不信前端传值，配合浮点安全乘法
- **删除策略三选一**：引用检查拒删（本项目：历史订单不可失联，最保守最正确）vs 级联删（业务上不可接受）vs 软删除 deleted_at（要动表结构，与"复刻既有表"契约冲突）；能按业务语义讲清为什么选哪个，比背概念有分量
- **请求日志的"摘要 vs 全量"取舍**：原项目在拦截器里全量 `JSON.stringify` 响应体落日志——密码/token/验证码全进日志文件（安全事故面）、大响应拖慢请求、日志体积失控；改为摘要行（method/url/status/耗时/操作者），敏感信息**结构上**进不了日志而不是靠"记得脱敏"；为什么挂 middleware 而不是 interceptor 能引申讲 Nest 请求生命周期
- **验证码闭环的三道防线**：TTL 5 分钟（redis setex 原子性）、发送冷却 60s 防刷（短信/邮件轰炸是真实资损）、错误 5 次销毁（10^6 空间在无上限时可暴力穷举）+ 一次性使用；错误响应统一"错误或已过期"文案不泄露内部状态；能对比讲"防枚举"：captcha 接口对未知邮箱直接 404 是学习项目的可调试性取舍，生产应统一话术让攻击者无法探测邮箱是否注册
- **上传安全的最小闭环**：落盘文件名 100% 服务端生成（uuid + mimetype→扩展名白名单映射），原始文件名只当展示数据——一次性防掉路径穿越、双扩展（`a.php.jpg`）、特殊字符三类攻击；大小限制在 multer limits 层流式中断而非收完再拒；能引申：mimetype 是客户端声明可伪造，生产加 magic bytes 深检（file-type 库），公开目录里绝不能出现可被服务端解释执行的文件类型
- **落库快照 vs 实时推导的对账模式**：活动状态落库是查询性能取舍（列表不用每行算时间窗），代价是时间流逝状态漂移（进行中→已结束不会自己变）；每分钟 cron 一条 CASE UPDATE 只改漂移行（WHERE status <> 期望值，无漂移零写入零日志）；验证时"未漂移行不被误改"与"漂移行被修正"同样重要——对账任务最怕误伤；能引申容器 UTC 与应用时区的时钟源一致性坑

## 契约链路阶段

### 知识点

- **契约三方对齐是一个"谁负责壳"的分工问题**（PLAN §7#11 落地）：后端 ResponseInterceptor 加 `{code,data,message}` 壳 → swagger 文档保持**裸类型**（壳是传输细节不是业务契约，写进 schema 会让每个类型都套一层泛型噪音）→ 前端 mutator 统一剥壳返回 `shell.data`。三方各守一环，orval 生成的类型恰好就是裸 data 形状，业务代码全程无感
- **swagger 运行时文档与导出契约必须同源**：`DocumentBuilder` 配置抽成 `buildOpenApiDocument(app)` 共享函数，main.ts 的 /api-docs 与 export-openapi.ts 都调它——两处各写一份的话，加个 `addBearerAuth` 只改一边就漂移了。导出脚本要 `NestFactory.create(AppModule)` 完整实例化（装饰器元数据要模块加载后才齐），所以**导出依赖 db/redis 在线**——这是"从运行时提取契约"路线的固有代价，换取的是零手工维护
- **orval 的两个契约点**：① hook 名来自 operationId（`AuthController_login` → `useAuthControllerLogin`），后端 controller/方法名就是前端 API 命名的源头，改名是 breaking change；② `tags-split` 按 `@ApiTags` 拆目录，后端模块边界直接映射成前端 API 目录结构——装饰器纪律（全量 @ApiProperty、@ApiTags 不缺）在这一步兑现回报
- **ky 的 `prefixUrl` 约定**：设了 prefixUrl 后 input **不允许以 `/` 开头**（会直接 throw），而 openapi 路径天然带 `/`——mutator 里 `url.replace(/^\//, '')` + `prefixUrl: '/'` 过桥；这是 ky 有意的设计（防止使用者误以为 `/x` 会覆盖 prefixUrl 的路径部分）
- **preview 的 launch.json 读会话 cwd 根**（`E:\code\github\.claude\launch.json`），不是项目自己的 `.claude/launch.json`——多项目工作区下 dev server 配置要登记到根文件才生效，项目内那份只当文档

### 面试可讲

- **后端代码作为类型单一事实来源**：swagger 装饰器 → openapi.json → orval 生成 TS 类型 + TanStack Query hooks，前端"手写 API 层"整个消失，后端改 DTO 前端 typecheck 直接红——对比手写共享 types 包方案（要人肉同步、漂移无感知）和 tRPC 方案（类型直通但绑死 TS 全栈、丢标准 OpenAPI 生态）；能讲清 openapi.json 与生成物**进 git** 的理由：契约变更在 code review 的 diff 里可见，而不是藏在 CI 的生成步骤里
- **错误归一化的分层**：HTTP 层杂音（超时/断网/非 2xx）与业务失败壳在 mutator 收敛成单一 `ApiError(code, message, detail)`，Query 的 onError 只认一种形状；字段级 400 的 message 数组不丢——文案压成"请求参数有误"、原数组存 detail 供表单逐字段回填，对应双层校验里"后端兜底、前端体验"的分工

## 前端阶段

### 知识点

- **atomWithStorage 两个默认行为都会咬人**：① `getOnInit` 默认 false——初始渲染先用 initialValue、挂载后才读 storage；路由 beforeLoad 在挂载前同步跑，不开它已登录用户刷新会被误判未登录踢回 /login；② `set(atom, null)` 会往 localStorage 写字符串 `"null"` 而非移除条目——要移除必须写入 `RESET` 符号；本项目用派生可写 atom 把 null→RESET 归一在写入口
- **React Compiler 在 React 18 的完整装配**：`babel-plugin-react-compiler` 配 `target: '18'` + dependencies 里装 `react-compiler-runtime`（18 没有内建 `react/compiler-runtime`，runtime 包 polyfill useMemoCache）；走 `@vitejs/plugin-react` 的 `babel.plugins` 通道；**验证生效**用无压缩构建 grep `useMemoCache`（minify 后标识符会没）
- **TanStack Router 文件路由的生成物依赖链**：`routeTree.gen.ts` 由 vite 插件在 dev/build 时生成——新 clone 或新增路由后**先起一次 dev 才能 typecheck**（tsc 依赖生成文件在场）；`_authenticated` 无路径布局路由 = 守卫挂点（beforeLoad throw redirect），子路由全部继承；`autoCodeSplitting` 免手写 lazy 每路由自动分 chunk
- **认证横切全挂 ky hooks 的收益**：beforeRequest 注 Bearer、afterResponse 收续期头 + 401 分流，三件事对业务代码和 orval 生成物完全透明——换库/加逻辑只动 mutator 一个文件；对照原项目在每个请求封装里手拼 header 的写法
- **pnpm add 裸包名拿的是 latest 大版本**：antd 6 已发布，`pnpm add antd` 直接上 6——按规划锁大版本要显式 `antd@^5.x`；大版本换代（尤其组件库）牵动配套生态（pro-components），不能被包管理器"顺手升级"
- **TanStack Router 的 context 是守卫层数据总线**：`createRootRouteWithContext<{queryClient}>` 声明形状 → createRouter 注入实例 → 布局路由 beforeLoad `ensureQueryData(currentUser)` 后 `return { me }`——me 同时进 Query 缓存（组件 useQuery 命中）和子路由 context（子 beforeLoad `context.me` 同步可用），一次预取两处消费，导航零重复请求；ensureQueryData 与 useQuery 用**同一份 queryOptions**（orval 生成的 getXxxQueryOptions）是缓存命中的关键——key 不一致就是两次请求
- **ProLayout 接非配套路由器的三个挂点**：它默认假设 umi/react-router，接 TanStack Router 要 ① `location={{ pathname }}`（从 useRouterState 取，受控当前项高亮）② `menuItemRender` 把菜单项包进 router 的 `<Link>`（否则点击整页刷新）③ `menuDataRender` 返回过滤后的树（me 变更即重算）；菜单树与路由树是**两份声明**（菜单是导航子集，403/登录页不进菜单），不必强求单一来源
- **菜单过滤规则也要"考古"出来而不是拍脑袋**：直觉规则"目录码控目录、叶子码控叶子"在种子数据下直接翻车——服务员挂了 HotProductList 却没挂 ProductManage 目录码，超管角色同样缺目录码；正确规则只能是"叶子看自身码、目录看是否有可见子项"。教训同后端旁路一例：**权限模型的语义藏在数据里**，实现前先把种子数据摸透
- **Browser pane 的 console 按 origin 跨重启累计**：preview 停起后 read_console_messages 仍会吐出上一轮会话的旧错误——定位问题先交叉验证（network 面板本轮请求状态 + 后端日志 grep），本轮全 200/零 401 即可断定 console 里的 401 是历史残留；否则会追着不存在的 bug 跑
- **exceptionFactory ↔ setFields 的契约闭环**：后端 ValidationPipe exceptionFactory 定制 400 形状 `[{field, errors[]}]` → mutator 原样存进 `ApiError.detail` → `applyFieldErrors` 认出数组形状就 `form.setFields` 逐字段回填、认不出（409 重名等 detail 是字符串）返回 false 交调用方 toast——一个分流函数吃掉所有 mutation onError；字段名是运行时数据，`NamePath<Values>` 编译期无法窄化，单点断言并注释即可
- **URL 单一事实来源的完整落法**：TanStack Router `validateSearch` 把脏参数归一成干净类型（page 下限、pageSize 白名单、空串剔除）+ **默认值不写进 URL**（page=1/pageSize=10 序列化时省略，URL 保持最短语义）+ 所有交互一律 `navigate({ search: updater })`；列表组件零 useState，Query key 天然含 search params——直链/刷新/回退/翻页全是同一机制；`placeholderData: keepPreviousData` + `loading={isFetching}` 让翻页保留旧数据不闪骨架
- **ProTable 受控接 TanStack Query 的边界**：不碰 `request` 属性（那是 ProTable 内建数据流，接上等于第二数据源，缓存/失效/重试全失控）；dataSource/loading/pagination 全受控 + `options={false}` 关掉自带工具栏刷新；URL→搜索表单的回显靠 `formRef` + useEffect 同步（直链进来搜索框要有值）；invalidate 用 orval 的 `getXxxQueryKey()` 做前缀匹配，改一条数据全部分页缓存作废
- **rc-motion 动画依赖合成帧——无头/未显示环境的排查套路**：Browser pane 未显示时页面不合成帧，antd Modal 的 zoom 动画卡在 `appear-prepare`/`leave-start`——React open 状态已翻转但 wrap 不撤、`afterClose`（含 resetFields）不触发；这不是代码 bug，断言改走 DOM/network、每轮模态交互后强刷清场。同环境下工具注入的 fetch/XHR 全被阻断而页面自身请求正常——验证要"点页面的按钮"，不能"替页面发请求"，两者网络路径不同
- **两条观察留档不顺手改**：① ProTable 搜索表单里按回车未触发提交（点查询按钮正常，主路径无碍）；② `ensureQueryData` 默认 staleTime 0——每次导航 currentUser 都重取（单次导航内守卫+组件仍共享一份），要减频给 queryOptions 配 staleTime 即可，当前请求 ~10ms 不值得为省它引入权限变更延迟

### 面试可讲

- **滑动续期的前端半场**（与后端条目合成完整故事）：后端 Guard 临期重签放响应头 `token` → 前端 ky afterResponse 静默替换 localStorage + atom——全程业务代码无感知、无 refresh 接口、无 401 重放队列，401 唯一语义就是"重新登录"；实测手法值得讲：把重签阈值调到大于 token 寿命，任意请求即触发，断言 storage 里 token 值变化
- **守卫为什么不在 beforeLoad 里验 token 有效性**：守卫只做同步存在性判断（零网络开销、无导航瀑布），有效性裁决权在后端——伪造/过期 token 放行后第一个接口 401，ky hook 清 token 硬跳登录，形成自愈闭环；对比"每次导航先 await currentUser"方案：多一次串行请求且仍然防不住"守卫过后 token 才过期"的窗口
- **一份权限点数据的前后端双投影**：同一张 18 码权限表，后端消费点是 `@RequirePermission(code)` + PermissionGuard（安全边界），前端消费点是菜单过滤 filterMenu、页面守卫 requireCode、按钮 `<Permission>`/usePermission（三级粒度，全是体验层）——前端隐藏防不住直接调接口，真正的裁决永远在后端 403；两端必须同语义（含 userType=0 旁路），否则出现"菜单可见接口 403"或"接口能通入口不见"的割裂。对比原项目前端把权限码写死在路由 meta：码表一改两边漂移
- **双层校验的分工与实证手法**：前端 rules 只管"格式即时反馈"（必填/长度/邮箱，体验层），后端 class-validator 是权威裁决（安全层）；两边不必逐条复刻——本项目**故意**不在前端写 username 32 字上限，33 字提交换来后端 400 字段级数组、`applyFieldErrors` 把文案精准回填到那个表单项下方，modal 不关、用户改完重交。这一刀让"前端校验可绕过、后端才是真校验"从口号变成可演示的闭环；顺带讲 detail 数组/字符串两形状的分流（字段回填 vs 全局 toast）
- **列表页的"无状态组件"论**：page/pageSize/筛选全推进 URL 后，列表组件本身零 useState——所有交互都是"改 URL"，数据是"URL 的函数"（Query key 含 search params，URL 变→key 变→自动重取）；直链分享、刷新恢复、浏览器回退、**末页删除唯一行自动回上一页**（就是一次 navigate page-1）全是同一套机制的免费收益。对比 useState 方案：这四个能力每个都要单独写状态同步，还躲不开"刷新丢页码"的经典缺陷
- **"登录成功即 403"死角分析**：登录后固定 navigate('/')，若首页也挂权限门槛，无 Home 码的角色（种子 rid3 实况）体验就是"密码对了却进不去系统"——落地页豁免 + 菜单照常过滤是常见解法；能引申：权限系统设计要过一遍"每个角色登录后第一屏是什么"的用例推演，纯按资源配权限容易漏掉导航流
