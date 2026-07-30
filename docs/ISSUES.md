# 问题与坑登记（ISSUES）

> 实际遇到的问题按条登记：**症状 → 根因 → 解法 → 状态**；与 [PLAN §7 预判坑](./PLAN.md#7-已知坑与预案) 对照（命中标 §7#N，未预判标"新坑"）。
> 新条目编号递增追加；状态：`open` / `solved` / `watch`（已绕过但需回头验证）。

## 索引

| #   | 标题                             | 状态   | PLAN 对照 |
| --- | -------------------------------- | ------ | --------- |
| 1   | 宿主 3306 被本机 mysqld 服务占用 | solved | 新坑      |

## 条目

### #1 宿主 3306 被本机 mysqld 服务占用（2026-07-30）

- **症状**：`docker compose up -d` 时 mysql 容器启动失败：`ports are not available: 0.0.0.0:3306 ... Only one usage of each socket address`
- **根因**：本机跑着 `mysqld.exe`（Windows 服务，PID 当次 112036）监听 3306——与 PLAN §8「本机 MySQL 未装」的探测结论不符（当时大概率只查了客户端命令，未查端口）
- **解法**：compose 映射改 `3307:3306`，后端连接串固定 `127.0.0.1:3307`；**不动系统服务**（排查链：`netstat -ano` 找 PID → `Get-CimInstance Win32_Process` 确认身份 → 决定绕行而非杀进程）
- **状态**：solved（3307 已固化为项目约定，写入 .env.example 与 TRACK 决策表）
- **对照**：新坑；顺带修正 §8 环境认知
