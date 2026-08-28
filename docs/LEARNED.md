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
- **金额的"权威在服务端"要做成协议而不是约定**：CreateOrderDto 里根本没有金额字段——前端想篡改都没有载体，服务端按商品价快照 × 数量 × 折扣用整数分位乘法算出 price/discountPrice；前端弹窗的金额预览用**同款 moneyMul 算法**并明示"以后端为准"，实测预览 ¥60.00/¥52.80 与响应逐分一致——不一致就是两端算法漂移的报警器。可延伸：快照语义的可视化——详情抽屉把商品当前价并列在订单快照价旁，调价 26→30 后 Tag"与下单时不同"点亮而订单价纹丝不动，"订单是历史事实不随商品变"从字段设计变成肉眼可验的产品行为
