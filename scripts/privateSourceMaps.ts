import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { Plugin } from 'vite';

import type { BuildInfo } from '../src/config/buildInfo';

/** map 和用于位置校验的 JS 副本只放在公开 dist 之外，按 release 保留历史。 */
export const privateSourceMaps = (build: BuildInfo): Plugin => ({
  name: 'wisepen-private-source-maps',
  apply: 'build',
  async writeBundle(options, bundle) {
    if (!options.dir) throw new Error('私有调试附件需要目录形式的构建产物。');
    const dist = path.resolve(options.dir);
    const root = path.resolve(dist, '..', '.wisepen-debug');
    const output = path.join(root, build.release);
    await mkdir(root, { recursive: true });
    await mkdir(output);
    const hash = (content: Buffer) => createHash('sha256').update(content).digest('hex');
    const assets: {
      file: string;
      map: string;
      sha256: string;
      mapSha256: string;
    }[] = [];

    for (const map of Object.keys(bundle)
      .filter((file) => file.endsWith('.map'))
      .sort()) {
      const file = map.slice(0, -4);
      const mapContent = await readFile(path.join(dist, map));
      await mkdir(path.dirname(path.join(output, map)), { recursive: true });
      await rename(path.join(dist, map), path.join(output, map));
      if (!/\.m?js$/.test(file)) continue;
      const content = await readFile(path.join(dist, file));
      await copyFile(path.join(dist, file), path.join(output, file));
      assets.push({ file, map, sha256: hash(content), mapSha256: hash(mapContent) });
    }

    if (assets.length === 0) throw new Error('构建没有生成可还原的 JS/source map 附件。');
    const publicFiles = await readdir(dist, { recursive: true });
    if (publicFiles.some((file) => /\.map$/i.test(file))) {
      throw new Error('公开构建目录包含 source map，拒绝发布。');
    }

    await writeFile(
      path.join(output, 'manifest.json'),
      `${JSON.stringify({ schemaVersion: 1, build, assets }, null, 2)}\n`
    );
  },
});
