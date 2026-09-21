import { readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

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

// 递归收集 dist 下的普通文件，并统一转换成 POSIX 风格路径
async function collectFiles(rootDir, currentDir = rootDir) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(rootDir, fullPath)));
      continue;
    }
    if (!entry.isFile()) continue;

    const relativePath = path.relative(rootDir, fullPath).split(path.sep).join('/');
    files.push(relativePath);
  }

  return files;
}

// manifest 是后续 OSS 发布和清理的唯一文件清单来源
const args = parseArgs(process.argv.slice(2));
const distDir = args.get('dist');
const outFile = args.get('out');
const release = args.get('release');
const buildMode = args.get('build-mode');

if (!distDir || !outFile || !release || !buildMode) {
  throw new Error('缺少必要参数：--dist --out --release --build-mode');
}

const distStat = await stat(distDir);
if (!distStat.isDirectory()) {
  throw new Error(`dist 目录不存在：${distDir}`);
}

// 排序可以保证同一份产物反复生成时清单内容稳定，方便审阅、归档和排查发布差异
const files = (await collectFiles(distDir)).sort();

// index.html 是静态站点的入口。没有入口文件时，即使其它 chunk 上传成功，
// 访问根路径仍然无法启动应用，因此这里拒绝继续发布
if (!files.includes('index.html')) {
  throw new Error('dist 中缺少 index.html，拒绝生成发布清单。');
}

// schemaVersion 为未来扩展清单格式保留版本位
// release 通常使用 Git short SHA；buildMode 用于区分 production/development 产物
const manifest = {
  schemaVersion: 1,
  release,
  buildMode,
  createdAt: new Date().toISOString(),
  files,
};

// 使用 UTF-8 和格式化 JSON 写出，便于 Jenkins archiveArtifacts 归档后人工查看
await writeFile(outFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`发布清单已生成：${outFile}，文件数：${files.length}`);
