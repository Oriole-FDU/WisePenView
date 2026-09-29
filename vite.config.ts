import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

import packageJson from './package.json' with { type: 'json' };
import { createPublicAppConfig } from './src/config/publicConfig';

export default defineConfig(({ mode }) => {
  // 无前缀：仅构建期使用，不会注入 import.meta.env 到浏览器
  const env = loadEnv(mode, process.cwd(), '');

  try {
    createPublicAppConfig({ ...env, MODE: mode });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[vite] ${message.replace(/^\[config\]\s*/, '')} 请检查 .env.${mode}`);
  }

  return {
    plugins: [react(), tailwindcss()],
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    server: {
      port: 5173,
      host: '127.0.0.1',
      allowedHosts: ['local.wisepen.oriole.cn'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@domain-apis': path.resolve(
          __dirname,
          `src/domains/_registry/apis.${mode === 'mock' ? 'mock' : 'impl'}.ts`
        ),
      },
    },
    build: {
      // PDF、BlockNote 和代码高亮均已按路由/语言按需加载，允许其运行时 chunk 保持较大体积。
      chunkSizeWarningLimit: 2500,
    },
  };
});
