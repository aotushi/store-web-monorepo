import { fileURLToPath, URL } from "node:url";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// 后端 3000；前端代码统一请求相对路径 /api/**（PLAN §5.7）；
// /uploads 是商品图静态资源（serve-static），生产同源部署时网关需同样转发
const backendProxy = { "/api": "http://localhost:3000", "/uploads": "http://localhost:3000" };

export default defineConfig({
  plugins: [
    // 文件路由：扫 src/routes/ 生成 src/routeTree.gen.ts（进 git，不手改）；须排在 react 插件前
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    // React Compiler：自动记忆化，全员禁手写 memo/useMemo/useCallback（PLAN §2）；
    // React 18 须 target:'18' + dependencies 里的 react-compiler-runtime
    react({ babel: { plugins: [["babel-plugin-react-compiler", { target: "18" }]] } }),
  ],
  resolve: {
    // 路径别名与 tsconfig paths 各配一处（PLAN §5.7）
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    // 剩余唯一超线块是 antd Table/ProTable 共享链路（min ~1MB / gzip ~322KB）：
    // 实测按包名手切 antd 生态（antd/rc-*/icons/pro 任意分组）必产生循环 chunk 警告
    // 且各块仍超 500KB——模块图纠缠是 antd 的固有形态，故显式提线接受，不再硬切
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        // 路由页面已由 autoCodeSplitting 分割，这里只拆依赖图干净的 vendor（无循环、
        // 低变更频率利长缓存）；入口块由 580KB 收敛到 ~320KB
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return "react-vendor";
          }
          if (id.includes("@tanstack")) return "tanstack-vendor";
        },
      },
    },
  },
  server: {
    port: 5173,
    // 端口被占直接报错，不许静默漂移（漂移会让 proxy/调试对着旧进程）
    strictPort: true,
    proxy: backendProxy,
  },
  // vite preview（验证生产分块产物）与 dev 同一套代理
  preview: { proxy: backendProxy },
});
