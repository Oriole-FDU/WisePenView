import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import packageJson from './package.json' with { type: 'json' };

const REQUIRED_CLIENT_URL_KEYS = [
  'VITE_API_BASE_URL',
  'VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL',
] as const;
const OPTIONAL_CLIENT_URL_KEYS = ['VITE_DRAWIO_EMBED_URL'] as const;
const REQUIRED_PRODUCTION_ONLY_KEYS = [
  'VITE_API_BASE_URL_INTRANET',
  'VITE_INTRANET_PING_PATH',
  'VITE_NETWORK_PROBE_TIMEOUT',
] as const;
const NO_TRAILING_SLASH_URL_KEYS = new Set<string>([
  'VITE_API_BASE_URL',
  'VITE_API_BASE_URL_INTRANET',
]);

function assertClientUrl(key: string, value: string, mode: string): void {
  try {
    new URL(value);
  } catch {
    throw new Error(`[vite] ${key} 必须是绝对 URL。请检查 .env.${mode}`);
  }

  if (NO_TRAILING_SLASH_URL_KEYS.has(key) && value.endsWith('/')) {
    throw new Error(`[vite] ${key} 不能以 / 结尾。请检查 .env.${mode}`);
  }
}

export default defineConfig(({ mode }) => {
  // 无前缀：仅构建期使用，不会注入 import.meta.env 到浏览器
  const env = loadEnv(mode, process.cwd(), '');

  const servicesRegistry = env.SERVICES_REGISTRY;
  if (!servicesRegistry) {
    throw new Error(
      `[vite] 缺少 SERVICES_REGISTRY。请在 .env.${mode}（或 .env）中配置，指向 registry.impl.ts 或 registry.mock.ts`
    );
  }

  for (const key of REQUIRED_CLIENT_URL_KEYS) {
    const value = env[key];
    if (!value) {
      throw new Error(`[vite] 缺少 ${key}。请检查 .env.${mode}`);
    }
    assertClientUrl(key, value, mode);
  }

  for (const key of OPTIONAL_CLIENT_URL_KEYS) {
    const value = env[key];
    if (value) {
      assertClientUrl(key, value, mode);
    }
  }

  if (mode === 'production') {
    for (const key of REQUIRED_PRODUCTION_ONLY_KEYS) {
      const value = env[key];
      if (!value) {
        throw new Error(`[vite] 缺少 ${key}。请检查 .env.${mode}`);
      }
      if (key === 'VITE_API_BASE_URL_INTRANET') {
        assertClientUrl(key, value, mode);
      }
      if (key === 'VITE_NETWORK_PROBE_TIMEOUT') {
        const timeout = Number(value);
        if (!Number.isFinite(timeout) || timeout <= 0) {
          throw new Error(`[vite] ${key} 必须是正数。请检查 .env.${mode}`);
        }
      }
    }
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
        '@services-registry': path.resolve(__dirname, servicesRegistry),
      },
    },
    build: {
      // PDF、BlockNote 和代码高亮均已按路由/语言按需加载，允许其运行时 chunk 保持较大体积。
      chunkSizeWarningLimit: 2500,
    },
  };
});
