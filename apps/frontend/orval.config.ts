import { defineConfig } from "orval";

// 契约链路（PLAN §5.3）：后端 openapi.json → 类型 + TanStack Query hooks
// 产物 src/apis/generated/ 不手改、进 git（契约演进靠 diff review）；重新生成：pnpm apis
export default defineConfig({
  storeWeb: {
    input: "../backend/openapi.json",
    output: {
      target: "src/apis/generated",
      client: "react-query",
      // 按后端 @ApiTags 拆目录（auth/user/product/...），与后端模块结构对齐
      mode: "tags-split",
      // 所有请求经 customFetcher（ky 发出 + 统一剥响应壳，PLAN §7#11 三方类型对齐）
      override: {
        mutator: { path: "src/apis/mutator.ts", name: "customFetcher" },
      },
    },
  },
});
