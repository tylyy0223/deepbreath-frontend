import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/app/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // 修复: 之前是 'http://wiki-host:8001' (Docker 内部 hostname), 在非容器化 dev 环境无法解析
        // dev 现在直接 systemd 跑 backend (端口 8003), 改成 127.0.0.1:8003
        target: 'http://127.0.0.1:8003',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
