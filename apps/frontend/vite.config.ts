import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
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
