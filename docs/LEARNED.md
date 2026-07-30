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

## 后端阶段（待开始）

## 契约链路阶段（待开始）

## 前端阶段（待开始）
