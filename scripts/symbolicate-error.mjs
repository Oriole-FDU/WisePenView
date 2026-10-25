import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { SourceMap } from 'node:module';
import path from 'node:path';
import { parseArgs } from 'node:util';

try {
  const { values } = parseArgs({
    options: {
      artifacts: { type: 'string' },
      release: { type: 'string' },
      frame: { type: 'string' },
    },
  });
  if (!values.artifacts || !values.release || !values.frame)
    throw new Error('必须提供 --artifacts、--release 和 --frame。');
  const root = await realpath(values.artifacts);
  const readArtifact = async (file) => {
    if (typeof file !== 'string' || path.isAbsolute(file) || file.split(/[\\/]/).includes('..')) {
      throw new Error('附件包含非法路径。');
    }
    const resolved = await realpath(path.join(root, file));
    if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error('附件路径越界。');
    return readFile(resolved);
  };
  const manifest = JSON.parse(await readArtifact('manifest.json'));
  if (manifest.build?.release !== values.release) throw new Error('release 与附件不匹配。');
  const match = values.frame.match(/^(assets\/[\w.-]+\.m?js):(\d+):(\d+)$/);
  if (
    !match ||
    !Number.isSafeInteger(Number(match[2])) ||
    !Number.isSafeInteger(Number(match[3])) ||
    Number(match[2]) < 1 ||
    Number(match[3]) < 1
  ) {
    throw new Error('帧必须是附件内 JS 的正整数行列。');
  }
  const asset = manifest.assets?.find((item) => item.file === match[1]);
  if (!asset) throw new Error('附件没有该 bundle。');
  const bundle = await readArtifact(asset.file);
  const map = await readArtifact(asset.map);
  const lines = bundle.toString('utf8').split(/\r?\n/);
  const generated = lines[Number(match[2]) - 1];
  if (generated === undefined || Number(match[3]) > generated.length + 1) {
    throw new Error('帧位置超出 bundle 范围。');
  }
  const hash = (value) => createHash('sha256').update(value).digest('hex');
  if (hash(bundle) !== asset.sha256 || hash(map) !== asset.mapSha256)
    throw new Error('附件完整性检查失败。');
  const original = new SourceMap(JSON.parse(map)).findOrigin(Number(match[2]), Number(match[3]));
  if (!original.fileName) throw new Error('该位置没有源代码映射。');
  console.log(
    JSON.stringify(
      { release: manifest.build.release, commit: manifest.build.commit, ...original },
      null,
      2
    )
  );
} catch (error) {
  console.error(`无法还原：${error.message}`);
  process.exitCode = 1;
}
