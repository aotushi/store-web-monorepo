import { defineConfig } from "vite-plus";

// 仅供 vp check/lint 读取的工作区级配置（apps/frontend 构建用的是自己的 vite.config.ts）：
// 开启 tsgolint 类型检查，让 vp check 一条命令覆盖 fmt + lint + type 三阶段（PLAN §4.3）
export default defineConfig({
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});
