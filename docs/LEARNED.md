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
- **antd 自定义表单控件的最小契约是 value/onChange**：组件接这对 props 就能直接放进 `Form.Item name` 下（Form 自动注入并接管状态）；PermissionTreeField 把 Tree 的 `checkedKeys`/`onCheck` 适配成这对即接入表单体系。注意 `checkStrictly` 下 onCheck 回参从数组变 `{checked, halfChecked}` 对象——同一个回调两种形状，要分流
- **defaultExpandAll 只在首次挂载时生效**：异步数据到达后 Tree 不会补展开——`if (!query.data) return <Spin/>` 让 Tree 晚挂载、首挂即有数据；"default 前缀 props 只读一次"是 antd 通用模式（defaultValue/defaultChecked 同理），受控数据 + default 类 props 组合时挂载时机就是语义的一部分
- **组树纯函数的兜底取向**：`buildPermissionTree` 对 parentId 指向不存在节点的行挂根呈现而非丢弃——这棵树是勾选 UI，节点丢了就永远勾不到（数据完整性 > 层级正确性）；配 4 个贴种子形状的用例（三层嵌套、孤儿挂根、按钮挂目录下）
- **受控组件的自动化"同步双击"竞态**：脚本在同一宏任务里连点受控 Tree 两个 checkbox，第二次 onCheck 基于**未重渲染的旧 checkedKeys** 计算，第一次勾选被覆盖（React 18 批处理，事件间无渲染帧）——真实用户点击间隔有帧不会踩；自动化要把每次交互拆成独立调用。顺带一坑：antd 两字按钮渲染成"取 消"（自动插空格），按文本找按钮先 `replace(/\s/g,'')`
- **契约生成物的 multipart/nullable 三坑一次踩齐**：① 无 `@ApiOkResponse` 的 multipart 端点 orval 生成 `void` 返回（swagger CLI 插件推不出 `Express.Multer.File` 入参端点的返回）——补 VO 再生成，不做前端 cast；② entity `images: string | null` 联合类型 design:type 反射是 Object → 生成 `{[key:string]:unknown}|null`——nullable 字段必须显式 `@ApiProperty({ type: String, nullable: true })`；③ orval 给 multipart 请求硬编码 `'Content-Type': 'multipart/form-data'` **无 boundary** 头——发 FormData 时头必须留给浏览器自动生成（带 boundary），mutator 按 `data instanceof FormData` 分流：走 ky `body`（`json` 选项会把 FormData JSON.stringify 成 `{}`）并丢弃该头。三坑同根：**契约链路上每一环都可能撒谎，修在最靠近源头的一环**
- **PATCH"不传即不动"下，删除性更新必须显式空值**：`JSON.stringify` 丢弃 undefined 键——图片"移除"若把字段设回 undefined，提交体里 images 键消失、后端语义变"没改"，删图静默失效；正确做法是移除写 `''`、编辑回显也用 `product.images ?? ''` 兜底，让"空"始终是显式值。规律：部分更新协议里，"没有这个键"与"这个键为空"是两个语义，前端表单默认行为（undefined 即省略）天然偏向前者
- **枚举含 0 的 URL 状态要"字面量收口"**：status 0/1/2 过 falsy 判断会把"未上架"当没筛选，一律 `!== undefined`；URL 层进来是 number、antd valueEnum 表单层是 string——单一 `parseStatus(v): 0|1|2|undefined` 函数收口两个来源，逐字面量比较让 TS 自然窄化，返回类型正好对上 orval 生成的参数枚举（const 对象 + typeof keyof 模式），全程零断言
- **自动化文件上传走"页面内存造件"**：canvas.toBlob → `new File` → `DataTransfer` → 赋给 `input[type=file].files` + dispatch change——触发的就是页面自身 Upload 的 customRequest 链路（请求由页面发出，绕开"工具注入 fetch 被阻断"的限制）；xlsx 等复杂二进制在 Node 里用**后端同款库**（exceljs）生成、放 vite public 目录、页面 fetch 回来包成 File，测完删净。配合发现一坑：中文经 bash→docker exec→mysql 三层传参会乱码，清理数据用 id 不用中文名匹配
- **引用检查的表口径要先摸数据契约**：商品拒删只查 store_order 主表（冗余 productId 快照列）不查 store_order_product 中间表——两表在下单事务里同写（"跟随维护"），主表有引用则中间表必有，查一张就够；验收时直插中间表没拦住，一度以为后端漏查，实际是**测试数据违反了业务不变量**（真实业务不存在只有中间表行的状态）。教训：造夹具前先读写入方代码，夹具必须符合业务事务的一致性形状
- **状态机按钮做条件渲染而非置灰**：付款只在 status=0 渲染、取消在 0/1 渲染、2 终态两者皆无——非法流转对用户不是"暂不可用"（置灰的语义）而是"不存在的操作"，前端渲染逻辑就是后端 ORDER_TRANSITIONS 的镜像文档；按钮藏了不等于安全，"选中商品后被人下架再提交"的竞态窗口由后端 400 兜底（实测：弹窗保持打开可改选，错误文案直达）。前端管"常态不可见"，后端管"任何时序都不可为"
- **契约坑的同型复现是修在源头的复利**：Order.desc 与 Product.images 是同一个坑（`string | null` 联合反射成 Object → 生成 `{[key:string]:unknown}|null`），第二次照方抓药一分钟修完——上个切片把修复规律记进文档（"nullable 字段必须显式 type"），这次写页面前先扫了一遍生成物就抓到它；对比若当时 cast 糊过去，这次还得重新踩一遍排查过程
- **rc-picker 是合成事件自动化的死角，验证要降到数据层**：RangePicker(showTime) 对脚本派发的事件几乎全免疫——面板"确定"按钮 click 无效、日期格 inner div 无效（td 上标记 range-start 却不进 selected）、Enter 提交无效（一坑：`new KeyboardEvent(..., {keyCode:13})` 的 keyCode 是只读遗留属性，构造传参被忽略恒为 0，需 defineProperty 补——但补了也不通）；更糟的是合成 PointerEvent 序列会把 React 事件系统整个搞挂（此后所有按钮 click、甚至 fiber props.onClick 直调都不再引发重渲染，只能整页刷新救回）。最终路线：从 form 元素 fiber 的 `memoizedProps.form` 抓 Form 实例 → `setFieldsValue` 直写数据层，dayjs 实例从 vite 预打包产物 `/node_modules/.vite/deps/dayjs.js` 动态 import。边界要想清楚：UI 拾取这段链路由 antd 自身保证（人手可操作），自动化验证的重心是**数据层 → 提交拆 ISO → 后端推导 → 回显组 dayjs** 的项目自有逻辑。附带观察：Modal 关闭动画未完成时重开，`afterClose`（含 resetFields）不触发、字段残留——只有脚本手速踩得到
- **pnpm 严格布局下"UI 库的配套工具库"必须显式声明**：页面 import dayjs 组 RangePicker 回显值——dayjs 是 antd 的依赖但非项目直接依赖，tsc 当场 `Cannot find module`；与后端 multer 一条同规律（显式 import 的包必须显式声明），前端版的区别是类型层即炸（编译期暴露，好过 multer 那次的运行期才炸）。声明时对齐宿主 range（antd 要 ^1.11.x）让 pnpm 去重成同一实例——date 库双实例会带来 isDayjs 跨实例判假类怪病
- **orval 对数字枚举生成 const 对象双声明**：DTO `@ApiProperty({enum:[0,1]})` 生成 `{NUMBER_0: 0, NUMBER_1: 1} as const` + `typeof X[keyof typeof X]` 字面量联合；表单值接口写宽 `number` 提交处必型错——表单接口直接写 `0 | 1`，实体侧（宽 number，无 enum 标注）进表单的回显边界处收窄。规律与 parseStatus 同源：**窄类型在协议层，宽类型在存储层，收窄动作只放在边界**
- **按日聚合的时区正确解是"SQL 取行 + JS 分桶"**：容器 mysqld 是 UTC 而挂钟语义是 +08——SQL 侧 `GROUP BY DATE(createTime)` 会用 UTC 日界切桶，昨夜 23:30 的单错归今天；正确分工是 SQL 只按窗口起点取行（起点由 JS 本地时钟算好作参数下发，与 deriveStatus/对账 cron 同一时钟源），分桶在 JS 侧完成——日界天然正确，"近 7 日缺日补零"顺手做掉（SQL GROUP BY 天生给不出零行）。配套两小坑：decimal 的 SUM 经驱动回来是字符串（精度语义）须 Number() 收口；浮点逐单累加后 `Math.round(x*100)/100` 收口到分。fixtures 设计即口径证明：昨夜 23:30/今晨 00:30 跨日界对单验桶归属、窗口外 ¥1000 大单验 total ≠ trend 合计
- **响应式布局是自动化断言的隐形变量**：撤权后断言"菜单该剩一项"却查到空菜单，排查半天权限链路，真相是浏览器 pane 视口过窄——ProLayout 判定 `screen-xs` 把侧栏收成抽屉，菜单根本不在 DOM；且断点类是**挂载时快照**，事后放大视口不重算，要 reload 重挂。教训：UI 自动化断言"元素不存在"前，先确认布局处于预期断点（查 `screen-*` 类或 innerWidth），"权限隐藏"与"响应式收纳"的 DOM 表现完全相同

### 面试可讲

- **滑动续期的前端半场**（与后端条目合成完整故事）：后端 Guard 临期重签放响应头 `token` → 前端 ky afterResponse 静默替换 localStorage + atom——全程业务代码无感知、无 refresh 接口、无 401 重放队列，401 唯一语义就是"重新登录"；实测手法值得讲：把重签阈值调到大于 token 寿命，任意请求即触发，断言 storage 里 token 值变化
- **守卫为什么不在 beforeLoad 里验 token 有效性**：守卫只做同步存在性判断（零网络开销、无导航瀑布），有效性裁决权在后端——伪造/过期 token 放行后第一个接口 401，ky hook 清 token 硬跳登录，形成自愈闭环；对比"每次导航先 await currentUser"方案：多一次串行请求且仍然防不住"守卫过后 token 才过期"的窗口
- **一份权限点数据的前后端双投影**：同一张 18 码权限表，后端消费点是 `@RequirePermission(code)` + PermissionGuard（安全边界），前端消费点是菜单过滤 filterMenu、页面守卫 requireCode、按钮 `<Permission>`/usePermission（三级粒度，全是体验层）——前端隐藏防不住直接调接口，真正的裁决永远在后端 403；两端必须同语义（含 userType=0 旁路），否则出现"菜单可见接口 403"或"接口能通入口不见"的割裂。对比原项目前端把权限码写死在路由 meta：码表一改两边漂移
- **双层校验的分工与实证手法**：前端 rules 只管"格式即时反馈"（必填/长度/邮箱，体验层），后端 class-validator 是权威裁决（安全层）；两边不必逐条复刻——本项目**故意**不在前端写 username 32 字上限，33 字提交换来后端 400 字段级数组、`applyFieldErrors` 把文案精准回填到那个表单项下方，modal 不关、用户改完重交。这一刀让"前端校验可绕过、后端才是真校验"从口号变成可演示的闭环；顺带讲 detail 数组/字符串两形状的分流（字段回填 vs 全局 toast）
- **列表页的"无状态组件"论**：page/pageSize/筛选全推进 URL 后，列表组件本身零 useState——所有交互都是"改 URL"，数据是"URL 的函数"（Query key 含 search params，URL 变→key 变→自动重取）；直链分享、刷新恢复、浏览器回退、**末页删除唯一行自动回上一页**（就是一次 navigate page-1）全是同一套机制的免费收益。对比 useState 方案：这四个能力每个都要单独写状态同步，还躲不开"刷新丢页码"的经典缺陷
- **"登录成功即 403"死角分析**：登录后固定 navigate('/')，若首页也挂权限门槛，无 Home 码的角色（种子 rid3 实况）体验就是"密码对了却进不去系统"——落地页豁免 + 菜单照常过滤是常见解法；能引申：权限系统设计要过一遍"每个角色登录后第一屏是什么"的用例推演，纯按资源配权限容易漏掉导航流
- **权限授予界面为什么要 checkStrictly（精确集合 vs 父子联动）**：授权的本质是精确 id 集合，不是树形选区——种子数据实锤两个"联动会篡改"的形状：超管挂 OrderManage 页面码却不挂 delete:order 按钮码（父子联动打开编辑一保存就多授了删除权），delete:product 挂在目录下而非页面下（勾页面带不出它、勾目录会带出一串）；antd Tree 的 checkStrictly 正是为此设计。可延伸对比：文件选择器/组织架构选人适合联动（选区语义），授权/标签适合 strict（集合语义）——同一个控件两种语义，选错默认值是真 bug 的温床
- **权限门控与 PATCH 语义的三层咬合**：permission/list 后端挂 PermissionManage 码，于是"仅有 RoleManage 的账号编辑角色"这个场景由三个独立机制自然合成——① 无码则树字段不渲染（不发必 403 的请求）② 字段未挂载则 validateFields 结果不含 permissionIds ③ 后端 EditRoleDto"不传即不动"——组合出"能改名改描述但碰不到权限集合"的产品语义，零专门代码。面试时能讲：这类"少写代码"不是省事，是每层语义都摆对了位置后的必然结果
- **验收数据自给自足的实证手法**：要验证按钮级门控需要"有页面码没按钮码"的账号，但种子用户密码不可考（bcrypt 每用户盐，同密码不同 hash，反推死路）——转而用被测功能自建夹具：建角色（仅勾 RoleManage+PermissionManage）→ 建用户挂角色 → 该用户登录实证（菜单只剩两项、5 行删除按钮全隐、树字段可见）→ 删清恢复基线。功能验收与测试夹具是同一套操作，全程零 SQL、零种子数据改动；这也是"权限矩阵测试要按角色建专用账号"的缩影
- **四码门控矩阵（页面码与操作码分离的完整形态）**：用户/角色页是"页面码=操作码"的退化形态（UserManage 既开门又控钮），商品页才是完整形态——ProductList 只开门，新建/编辑/导入挂 ProductManage、上下架挂 updateStatus:product、删除挂 delete:product，一行三码。决定性实证：给服务员临时加 ProductList 单码 → 7 行数据正常渲染但操作列全空、工具栏零按钮——页面可见性与操作可用性是两套独立授权。能引申：这正是"页面级权限做粗、按钮级权限做细"的 RBAC 分层落地，前端 `<Permission code>` 的 code 直接对齐后端 `@RequirePermission` 的 code，两端同一张码表
- **multipart 上传的 Content-Type 是"谁都不能手写"的头**：boundary 每次请求随机生成，`multipart/form-data; boundary=----xxx` 只能由浏览器在序列化 FormData 时产出——手写（包括代码生成器 orval 生成的）必然缺 boundary，后端 busboy/multer 直接 400 "Boundary not found"。修复位置选在 mutator（所有生成请求的必经点）而非逐接口打补丁：`instanceof FormData` 分流 + 丢弃伪头，未来任何 multipart 接口零配置正确。可延伸：axios 自动删这个头所以坑少被发现，fetch/ky 尊重显式头所以坑必现——"库替你擦屁股"和"库忠实执行"两种哲学
- **excel 导入的错误呈现是契约形状驱动的**：后端行级 400 detail `[{row, errors[]}]` 与字段级 `[{field, errors[]}]` 同风格不同键——前者没有对应表单字段，applyFieldErrors 无从回填，型别守卫认出 row 形状后走 Modal 逐行呈现（"第 N 行：错误1；错误2"），字符串 detail（表头不符/非法文件）继续走 toast；配上后端"全对才入库"（好行也不进），用户拿到的是**一次修完的完整清单**而非挤牙膏式逐行报错。设计对仗：收集全部错误一次抛 ↔ 呈现全部错误一个框
- **门控粒度是后端接口码分布的投影（三码 vs 四码对比）**：订单页 OrderManage 一码兼页面+下单+列表+详情，只有状态流转（cancel:order）和删除（delete:order）另设码——于是"详情/新建"按钮**不包** `<Permission>`（进得来页必有码，包了是假防护真噪音），付款/取消/删除才包；对比商品页 ProductList 只开门、一行三操作码。决定性实证做到接口层同构：临时给服务员单授 OrderManage → 页面可进、新建可见、行内只剩详情，同一账号直调接口 create 201 / updateOrder 403 / delete 403——**按钮可见性与接口权限逐码一致**。结论：前端不发明门控粒度，`<Permission>` 的分布抄后端 `@RequirePermission` 的分布，码表是唯一设计源
- **门控矩阵收官：悬空按钮码与接口码正交性（两码形态补全谱系）**：活动页把粒度谱系走完——四码（商品）/三码（订单）/两码（活动：ActivityManage 兼页面+创建+列表+编辑，仅删除另设 delete:activity）/退化一码（用户/角色）。两个独有实证：① **悬空按钮码自动激活**——服务员种子数据天然持有 delete:activity 却无页面码（进不了页，删除码悬空无处生效），SQL 单授 ActivityManage 页面码后刷新，删除按钮**零配置自动出现**：`<Permission>` 分布是静态代码、权限数据是动态集合，二者独立演化、组合生效；② **接口码正交性**——revoke 页面码后同一 token，create 403 而 DELETE 依旧 200（delete:activity 还在），证明后端逐接口独立鉴权、操作码不依赖页面码存在：**前端菜单/页面/按钮三级门控全是 UX 遮罩，安全边界只有后端 403 一处**。这两刀合起来能答"前端权限控制有什么用/防得住什么"：防的是误操作与困惑（体验层），防不住 curl（安全层），两层各司其职才是完整答案
- **派生状态字段的 UI 三原则（活动状态 = 时间窗的函数）**：活动 status 不是用户操作而是 `deriveStatus(start, end, now)` 的落库快照（创建/编辑重推 + cron 每分钟对账修漂移），前端处理三原则——**不可编辑**（表单无 status 字段，列表只读 valueEnum 呈现）、**变更可见**（编辑成功 toast 带上后端重推结果"已保存（已结束）"，改期导致的状态跳变当场可见）、**解释来源**（用户认知是"我改了时间"而非"我改了状态"，系统自动改写的字段必须在交互反馈里露脸，否则就是"我没动它怎么变了"的工单）。可延伸：订单状态是**事件驱动**状态机（用户动作流转）、活动状态是**时间驱动**派生值（时钟流转），同一张表俩 status 字段两套心智模型，前端呈现策略（按钮条件渲染 vs 只读+toast 回显）分别贴合
- **看板聚合接口的四个设计题一次答全**：① 端点形状——一屏一请求（单 /stats/overview 复合 VO）而非四个小端点：看板无局部刷新诉求，多端点只多出瀑布与部分失败态；嵌套结构逐个显式 VO 类声明，orval 端拿到完整类型树。② 权限——复用 Home 页面码不新造 Dashboard 码：权限点与 @RequirePermission 同源只读是既定契约，新码要动种子数据。③ 口径——计单与计钱分离（cancelled/unpaid 计单不计钱、total 全量 paid、today/trend 只看窗口），口径不是实现细节而是接口契约，写进字段描述。④ 时区——UTC 容器 + 本地日界的"SQL 取行 JS 分桶"。实证手法同样可讲：fixtures 按口径边界设计（跨日界对单、窗口外大单），断言的是口径本身而非"接口通了"
- **数据层门控补全三级门控的第四位（enabled 双闸）**：首页守卫豁免（防"登录成功即 403"死角）但统计接口挂 Home 码——若只做渲染分支，无码账号的 query 照发、403 照吃；正解是门控下沉数据层：`canView` 同时控渲染（降级卡）与 `useQuery enabled`（不发请求），浏览器实证撤码后 /stats 请求数为 **0**。与角色页"树字段双门控"（字段渲染 + role/list enabled）同一模式的页级应用——规律：**权限判定要同时抵达"看得见什么"与"发不发请求"两个消费端**，只控 UI 是把 403 当 UX，只控请求是空屏无解释
- **金额的"权威在服务端"要做成协议而不是约定**：CreateOrderDto 里根本没有金额字段——前端想篡改都没有载体，服务端按商品价快照 × 数量 × 折扣用整数分位乘法算出 price/discountPrice；前端弹窗的金额预览用**同款 moneyMul 算法**并明示"以后端为准"，实测预览 ¥60.00/¥52.80 与响应逐分一致——不一致就是两端算法漂移的报警器。可延伸：快照语义的可视化——详情抽屉把商品当前价并列在订单快照价旁，调价 26→30 后 Tag"与下单时不同"点亮而订单价纹丝不动，"订单是历史事实不随商品变"从字段设计变成肉眼可验的产品行为

## 工程化收尾阶段（2026-08-29）

### 知识点

- **换代工具的"默认值差异"要用显式化消解，不是改代码迁就**：vp check 的 type 阶段（tsgolint，TS7/tsgo 工具链）一开跑就爆 128 个 TS2564（属性无初始化器）——NestJS 全部 DTO/VO/entity 的形状声明式写法都中招，但本地 tsc --noEmit 一直是绿的。根因不是代码错而是**默认值不同**：tsgo 把 strict 家族默认开，tsc 默认关。解法是往 tsconfig 写显式 `strictPropertyInitialization: false`——显式声明让两套工具读出同一语义，比给上百个属性加 `!` 断言（迁就新工具）或放弃 type 阶段（迁就旧习惯）都对。配套两处 tsconfig 现代化：tsgo 要求 rootDir 显式、baseUrl 已废弃（无 paths 时删掉零影响）
- **oxfmt/oxlint 的配置发现机制会执行子项目 vite.config**：vp 的 fmt/lint 为了读 `lint`/`fmt` 配置字段会 loadViteConfigField——真的 resolveConfig 执行 apps/frontend/vite.config.ts，tanstack router 插件在错误 cwd 下 configResolved 即扫 src/routes 报 ENOENT（走 allSettled 不中断，只留噪音栈）。同族坑：`vp fmt <glob>` 形态会直接崩，无参 `vp check` 不崩。工程含义：**vite.config 会被构建以外的工具在任意 cwd 执行**，插件副作用（生成文件、扫目录）要能容忍这一点；vp 的 ignore 默认读 .gitignore + .prettierignore，生成物排除一处配置两套工具同时生效
- **manualChunks 不是银弹，antd 生态按包名切必产循环 chunk**：两轮实验数据——antd 全聚一块得 1.3MB（比原警告块更大）；细分 antd/rc-*/icons/pro 四块得 3 块仍超 500KB 外加两条 Circular chunk 警告（rc-util 类共享工具被所有分组交叉引用，切法违背模块图）。有效的部分：react/tanstack 这类**依赖图干净**的 vendor 拆出后入口块 580KB→320KB。剩余 Table 链路 1MB 块的处置是显式 chunkSizeWarningLimit + 注释存证——gzip 后 322KB、懒加载共享块、后台系统场景可接受；**警告线是提示不是 KPI，评估口径是 gzip 传输量与缓存命中，不是 min 后的数字好看**
- **生产分块必须用产物验证，dev server 证明不了**：dev 模式走 esm 直出不经过 rollup 分块，manualChunks 配错（循环加载、初始化顺序）只在 build 产物上白屏。vite preview 起 dist + `preview.proxy` 配同 dev 的后端代理（一处常量两处引用），登录进列表页跑真实请求链——顺带把 mutator 序列化改动的冒烟一起做了（page/pageSize number、中文 name URL 编码逐一实证 200）

### 面试可讲

- **三合一 check 的工具链换代（oxfmt+oxlint+tsgolint）**：原本 check 是三工具三套配置三次进程（prettier/eslint/tsc，全仓分钟级）；vp check 一条命令 fmt+lint+type 三阶段 ~1.9s（32 线程，Rust 系）。落地要点三件：① 分域共存——oxfmt 只管 js/ts，prettier 保留 less/css/json/md/yml/html（实测两者对 json 结果兼容，无缝换）；② beta 工具的风险管理——PLAN 预留"type 阶段噎住就退回 tsc --noEmit"的逃生门，实验后默认值差异可显式化消解、没用上退路，但**先想好退路再上车**的决策结构本身可讲；③ 全仓格式化 commit 单独隔离（114 文件纯格式），逻辑变更零混入，git blame 可跳过
- **分包优化的诚实工程学**：面对 1MB chunk 警告，没有直接抄"manualChunks 按包名切 vendor"的网红配方，而是实验驱动——两轮切法的尺寸/循环警告数据摆出来，结论是 antd 模块图纠缠不可按包切；最终形态"切干净的（react/tanstack，入口 -45%）+ 接受切不动的（显式提线+注释存证）"。能引申：优化的第一产出是**认知边界**（什么能优化、什么是固有形态），把警告压没的手段有一万种，留下"为什么停在这里"的证据才是工程判断

## 后端自动化测试（2026-08-30）

### 知识点

- **构造注入纯类的两种测试形态，薄的优先**：守卫与 service 全部依赖走构造注入、不碰 req/res（PLAN §6.4 边界），于是单测可以**直构 + 手写依赖桩**（`new JwtAuthGuard(jwtStub, reflectorStub, configStub)`），不起 Nest 测试容器——13 个用例毫秒级。`@nestjs/testing` 的 `Test.createTestingModule` 只在 e2e 用（要的就是真实 DI 图与全模块装配）。判据：单测测的是**这个类的分支语义**，容器是无关成本；e2e 测的是**装配本身**，容器就是被测物
- **e2e 与运行时的装配必须同源，否则测的是另一个应用**：全局前缀/ValidationPipe/响应壳/异常过滤器原先在 main.ts bootstrap 手工挂载——e2e 若自行复制这段，改一处忘一处后 e2e 通过但生产行为不同。抽 `setup-app.ts` 共享函数（main.ts 与 e2e 各调一次）后，supertest 断言的壳形状、字段级 400、守卫链就是生产链路本身。全局守卫不在此列——APP_GUARD 是 AppModule 的 provider，随模块自带，这正是"守卫注册进模块而非 main.ts"的隐藏红利
- **tsc 增量构建的状态文件与产物可以脱节**：`rm -rf dist` 后重跑 nest build，产物只有两个改动过的文件——`.tsbuildinfo` 还在，增量逻辑判定其余文件"无需重发射"，跑 start:prod 直接 `Cannot find module './app.module'`。删产物必须连状态一起删（`*.tsbuildinfo` 已在 .gitignore，但**在磁盘上仍会骗过下一次构建**）；CI 无此坑（每次全新 checkout），这是"本地绿 CI 也绿"反过来不成立的一个实例
- **tsgo 的 @types 处理与 tsc 又一处默认值差异**：加入首个 spec 文件后 vp check 爆 69 个 `Cannot find name 'expect'`——tsc 默认自动包含所有 node_modules/@types，tsgo 不扫。解法仍是显式化：`types: ["node", "jest"]` 白名单让两套工具读到同一语义。要点：`types` 字段只控制**全局环境类型注入**，import 触发的模块型 @types（express/supertest 等）不受影响，白名单不会误伤
- **GitHub Actions services 的两个形态约束**：① service 容器在 checkout 之前启动，挂不了仓库卷——compose 里 `/docker-entrypoint-initdb.d` 的种子初始化在 CI 里要改成 mysql client 手动灌；② `mysql < sql/*.sql` 会失败，bash 对**重定向目标不做 glob 展开**，得走 `cat sql/*.sql | mysql`。凭据/端口直接对齐 compose 默认值（3307/store123456），`.env.example` 复制即 CI 环境——"clone 后零配置"的决策在第三个环境（本地 dev / docker / CI）兑现

### 面试可讲

- **测试边界是选出来的，不是越多越好**：PLAN §6.6 提前划线——service 纯逻辑必测（RBAC 判定、续期阈值这两处**出错即安全事故**的分支）+ auth 一条 e2e 冒烟（装配级回归网），controller 薄层与 CRUD 搬运不测。13 单测 + 4 e2e 不到百行断言，覆盖的是"权限判错放行越权请求""续期签出带旧 exp 的死 token"这类高价值故障面；能讲清楚**为什么不测的部分不值得测**（薄层无分支、改动即编译错），比堆覆盖率数字更有说服力
- **CI 门禁的分层演进**：三步走有意为之——先 check（静态）、再 build（能编译）、最后 services + e2e（能运行）；每层失败定位成本递增，便宜的挡在前面。e2e 那层把 dev 环境的三件套决策（compose 凭据即默认值、种子 sql 单文件、.env.example 可直接用）在 CI 复用，新环境接入成本趋近于零——基础设施决策的复利体现
