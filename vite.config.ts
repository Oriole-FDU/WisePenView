import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

import packageJson from './package.json' with { type: 'json' };
import { createPublicAppConfig } from './src/config/publicConfig';

export default defineConfig(({ mode }) => {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const buildId = randomUUID();
  const buildInfo = {
    version: packageJson.version,
    commit,
    buildId,
    mode,
    release: `${packageJson.version}-${commit.slice(0, 12)}-${buildId}`,
    dirty: Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()),
  };
  // 无前缀：仅构建期使用，不会注入 import.meta.env 到浏览器
  const env = loadEnv(mode, process.cwd(), '');

  try {
    createPublicAppConfig({ ...env, MODE: mode });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[vite] ${message.replace(/^\[config\]\s*/, '')} 请检查 .env.${mode}`);
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'wisepen-build-identity',
        apply: 'build',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'build-info.json',
            source: `${JSON.stringify(buildInfo, null, 2)}\n`,
          });
        },
      },
    ],
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      __APP_BUILD_INFO__: JSON.stringify(buildInfo),
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
      // CI 不需要 gzip 体积报告，跳过逐 chunk 压缩统计以缩短构建时间。
      reportCompressedSize: !process.env.CI,
      // PDF、BlockNote 和代码高亮均已按路由/语言按需加载，允许其运行时 chunk 保持较大体积。
      chunkSizeWarningLimit: 2500,
    },
  };
});
