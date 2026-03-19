import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://10.176.44.11:9080', // 你的后端 IP 和端口
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // 如果后端接口没带 /api 前缀就加上这行
      },
    },
  },
});
