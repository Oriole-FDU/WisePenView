import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

const PROD_REQUIRED_KEYS = [
  'VITE_API_SERVER_ADDR_EXTRANET',
  'VITE_API_SERVER_ADDR_INTRANET',
  'VITE_INTRANET_PING_PATH',
] as const;

export default defineConfig(({ mode }) => {
  // 无前缀：仅构建期使用，不会注入 import.meta.env 到浏览器
  const env = loadEnv(mode, process.cwd(), '');

  const servicesRegistry = env.SERVICES_REGISTRY;
  if (!servicesRegistry) {
    throw new Error(
      `[vite] 缺少 SERVICES_REGISTRY。请在 .env.${mode}（或 .env）中配置，指向 registry.impl.ts 或 registry.mock.ts`
    );
  }

  // env 内容由开发者/运维控制，仅做"非空"存在性校验，不在构建期跑格式正则。
  // 非 production 使用单一 VITE_API_SERVER_ADDR；production 启动期在内外网地址中探测选择。
  if (mode !== 'production' && !env.VITE_API_SERVER_ADDR) {
    throw new Error(`[vite] 缺少 VITE_API_SERVER_ADDR。请检查 .env.${mode}`);
  }

  // production 模式：校验校内 / 外网 addr 和 ping 探针路径
  if (mode === 'production') {
    for (const key of PROD_REQUIRED_KEYS) {
      if (!env[key]) {
        throw new Error(`[vite] 缺少 ${key}。请检查 .env.${mode}`);
      }
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      host: '0.0.0.0',
      allowedHosts: ['local.wisepen.oriole.cn'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@services-registry': path.resolve(__dirname, servicesRegistry),
      },
    },
  };
});
