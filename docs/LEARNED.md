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

### 面试可讲

- **默认安全的守卫设计**：全局 APP_GUARD + `@Public()` 豁免（漏配 = 多拦，安全兜底）对比逐接口手挂 Guard（漏配 = 裸奔）；鉴权用 `@RequirePermission(code)` 声明式，code 与前端按钮权限点同源一套数据，对比原项目 `permission_api` 表按 url+method 匹配的脆弱性（改路由即失效、`Get`/`GET` 大小写不一致已在种子数据里出现）
- **单 token 滑动续期**：Guard 内检查剩余有效期 < 阈值即重签、新 token 放响应头（配 CORS `exposedHeaders`），前端拦截器静默替换——对比双 token（refresh token）方案：实现简单、无并发刷新竞态，代价是无法服务端吊销单次会话；实测可演示（阈值调大即每请求触发）
- **GET 副作用是真实事故源**：原项目 `GET /user/delete/:id`——GET 可被浏览器预取/爬虫/链接扫描触发，语义上应幂等无副作用；复刻时改语义化 `DELETE`，无害路径（`/user/edit`）保持原样以便对照。能引申讲 REST 方法语义、幂等性、safe method 三个概念的区别
- **无外键表的删除一致性**：原库全部裸表（无 FK），删除必须应用层保证——事务内先清关系表再删主表；对比外键 `ON DELETE CASCADE` 方案的取舍（DB 兜底 vs 迁移灵活/分库友好，互联网大表普遍去外键）；种子里的孤儿行就是不做这件事的后果实证
- **订单三件套设计**：① 冗余商品名/价格是**下单快照**语义（商品后续改名改价不影响历史订单），不是坏设计——但原表把它和关联表混用才是问题；② 状态流转用显式转移表 `{0:[1,2], 1:[2], 2:[]}` 而非 if 链，非法流转一律 400，新增状态只改一处；③ 金额服务端算、绝不信前端传值，配合浮点安全乘法
- **删除策略三选一**：引用检查拒删（本项目：历史订单不可失联，最保守最正确）vs 级联删（业务上不可接受）vs 软删除 deleted_at（要动表结构，与"复刻既有表"契约冲突）；能按业务语义讲清为什么选哪个，比背概念有分量

## 契约链路阶段（待开始）

## 前端阶段（待开始）
