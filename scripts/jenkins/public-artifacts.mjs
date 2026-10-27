import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export function assertPublicPath(file) {
  if (
    typeof file !== 'string' ||
    !file ||
    path.isAbsolute(file) ||
    file.includes('\\') ||
    file.split('/').some((part) => part === '..' || part === '.wisepen-debug') ||
    /\.map$/i.test(file)
  ) {
    throw new Error(`公开发布文件路径无效或包含 source map：${file}`);
  }
}

/** 发布前遍历真实目录，不依赖可能过期或被替换的文件清单。 */
export async function collectPublicFiles(root, directory = root) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    const file = path.relative(root, full).split(path.sep).join('/');
    assertPublicPath(file);
    if (entry.isSymbolicLink()) throw new Error(`公开发布目录不能包含符号链接：${file}`);
    if (entry.isDirectory()) files.push(...(await collectPublicFiles(root, full)));
    else if (entry.isFile()) {
      if (
        /\.(?:m?js|css)$/.test(file) &&
        /^\s*(?:\/\/[#@]|\/\*[#@])\s*sourceMappingURL=/m.test(await readFile(full, 'utf8'))
      ) {
        throw new Error(`公开发布文件不能引用 source map：${file}`);
      }
      files.push(file);
    }
  }
  return files.sort();
}
