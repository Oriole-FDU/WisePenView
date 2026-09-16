import { rmSync } from 'node:fs';

import { build, context } from 'esbuild';

const watch = process.argv.includes('--watch');

const commonBuildOptions = {
  bundle: true,
  external: ['electron'],
  platform: 'node',
  sourcemap: watch,
  target: 'node22',
};

const mainBuildOptions = {
  ...commonBuildOptions,
  entryPoints: ['electron/main/index.ts'],
  format: 'esm',
  outfile: '.electron/main/index.js',
};

const preloadBuildOptions = {
  ...commonBuildOptions,
  entryPoints: ['electron/preload/index.ts'],
  format: 'cjs',
  outfile: '.electron/preload/index.cjs',
};

if (watch) {
  const [mainBuildContext, preloadBuildContext] = await Promise.all([
    context(mainBuildOptions),
    context(preloadBuildOptions),
  ]);
  await Promise.all([mainBuildContext.watch(), preloadBuildContext.watch()]);
  process.stdout.write('Electron 主进程与预加载脚本正在监听文件变更。\n');
} else {
  rmSync('.electron', { force: true, recursive: true });
  await Promise.all([build(mainBuildOptions), build(preloadBuildOptions)]);
}
