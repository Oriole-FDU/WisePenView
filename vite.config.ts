import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';

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
        name: 'wisepen-debug-artifacts',
        apply: 'build',
        async writeBundle(options) {
          if (!options.dir) throw new Error('调试附件需要目录形式的构建产物。');
          const dist = path.resolve(options.dir);
          const artifactsRoot = path.resolve(dist, '..', '.wisepen-debug');
          const output = path.join(artifactsRoot, buildInfo.release);
          await rm(artifactsRoot, { recursive: true, force: true });
          await mkdir(output, { recursive: true });
          const assets = [];
          const hash = (content: Buffer) => createHash('sha256').update(content).digest('hex');
          const files = (await readdir(dist, { recursive: true })).map((file) =>
            file.split(path.sep).join('/')
          );
          // map 移出公开目录；JS 副本用于核对哈希和压缩后的位置。
          for (const map of files.filter((file) => file.endsWith('.map')).sort()) {
            const file = map.slice(0, -4);
            const bundleContent = await readFile(path.join(dist, file));
            const mapContent = await readFile(path.join(dist, map));
            await mkdir(path.dirname(path.join(output, map)), { recursive: true });
            await copyFile(path.join(dist, file), path.join(output, file));
            await rename(path.join(dist, map), path.join(output, map));
            assets.push({ file, map, sha256: hash(bundleContent), mapSha256: hash(mapContent) });
          }
          if (!assets.length) throw new Error('构建没有生成 source map。');
          await writeFile(path.join(dist, 'build-info.json'), JSON.stringify(buildInfo, null, 2));
          await writeFile(
            path.join(output, 'manifest.json'),
            JSON.stringify({ build: buildInfo, assets }, null, 2)
          );
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
      sourcemap: 'hidden',
      // CI 不需要 gzip 体积报告，跳过逐 chunk 压缩统计以缩短构建时间。
      reportCompressedSize: !process.env.CI,
      // PDF、BlockNote 和代码高亮均已按路由/语言按需加载，允许其运行时 chunk 保持较大体积。
      chunkSizeWarningLimit: 2500,
    },
  };
});
