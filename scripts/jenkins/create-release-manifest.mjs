import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { collectPublicFiles } from './public-artifacts.mjs';

// Jenkins 通过命令行参数把构建目录、清单输出位置和发布版本传给本脚本
function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value == null) {
      throw new Error(`参数格式错误：${argv.join(' ')}`);
    }
    args.set(key.slice(2), value);
  }
  return args;
}

// manifest 是后续 OSS 发布和清理的唯一文件清单来源
const args = parseArgs(process.argv.slice(2));
const distDir = args.get('dist');
const outFile = args.get('out');
const buildMode = args.get('build-mode');

if (!distDir || !outFile || !buildMode) {
  throw new Error('缺少必要参数：--dist --out --build-mode');
}

const distStat = await stat(distDir);
if (!distStat.isDirectory()) {
  throw new Error(`dist 目录不存在：${distDir}`);
}

// 排序可以保证同一份产物反复生成时清单内容稳定，方便审阅、归档和排查发布差异
const files = await collectPublicFiles(distDir);

// index.html 是静态站点的入口。没有入口文件时，即使其它 chunk 上传成功，
// 访问根路径仍然无法启动应用，因此这里拒绝继续发布
if (!files.includes('index.html')) {
  throw new Error('dist 中缺少 index.html，拒绝生成发布清单。');
}

const build = JSON.parse(await readFile(path.join(distDir, 'build-info.json'), 'utf8'));
if (
  typeof build.version !== 'string' ||
  !build.version ||
  !/^[a-f0-9]{40}$/.test(build.commit) ||
  typeof build.buildId !== 'string' ||
  !build.buildId ||
  build.mode !== buildMode ||
  build.release !== `${build.version}-${build.commit.slice(0, 12)}-${build.buildId}` ||
  typeof build.dirty !== 'boolean'
) {
  throw new Error('构建身份无效或构建模式不匹配，拒绝生成发布清单。');
}

const manifest = {
  schemaVersion: 1,
  release: build.release,
  build,
  buildMode,
  createdAt: new Date().toISOString(),
  files,
};

// 使用 UTF-8 和格式化 JSON 写出，便于 Jenkins archiveArtifacts 归档后人工查看
await writeFile(outFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`发布清单已生成：${outFile}，文件数：${files.length}`);
