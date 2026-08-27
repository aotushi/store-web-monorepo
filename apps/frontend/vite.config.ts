import { fileURLToPath, URL } from 'node:url';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    // 文件路由：扫 src/routes/ 生成 src/routeTree.gen.ts（进 git，不手改）；须排在 react 插件前
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    // React Compiler：自动记忆化，全员禁手写 memo/useMemo/useCallback（PLAN §2）；
    // React 18 须 target:'18' + dependencies 里的 react-compiler-runtime
    react({ babel: { plugins: [['babel-plugin-react-compiler', { target: '18' }]] } }),
  ],
  resolve: {
    // 路径别名与 tsconfig paths 各配一处（PLAN §5.7）
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // 端口被占直接报错，不许静默漂移（漂移会让 proxy/调试对着旧进程）
    strictPort: true,
    // 后端 3000；前端代码统一请求相对路径 /api/**（PLAN §5.7）
    proxy: { '/api': 'http://localhost:3000' },
  },
});
