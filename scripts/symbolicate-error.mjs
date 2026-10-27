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
    if (
      typeof file !== 'string' ||
      !file ||
      path.isAbsolute(file) ||
      file.includes('\\') ||
      file.split('/').includes('..')
    )
      throw new Error('附件包含非法路径。');
    const resolved = await realpath(path.join(root, file));
    if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error('附件路径越界。');
    return readFile(resolved);
  };
  const manifest = JSON.parse(await readArtifact('manifest.json'));
  if (manifest.schemaVersion !== 1 || manifest.build?.release !== values.release)
    throw new Error('release 与附件不匹配或 manifest 无效。');
  const match = /^((?:[\w.-]+\/)*[\w.-]+\.m?js):([1-9]\d*):([1-9]\d*)$/.exec(values.frame);
  if (!match || !Number.isSafeInteger(Number(match[2])) || !Number.isSafeInteger(Number(match[3])))
    throw new Error('帧必须是附件内 JS 的正整数行列。');
  const asset =
    Array.isArray(manifest.assets) && manifest.assets.find((item) => item.file === match[1]);
  if (!asset) throw new Error('附件没有该 bundle。');
  const bundle = await readArtifact(asset.file);
  const map = await readArtifact(asset.map);
  const hash = (value) => createHash('sha256').update(value).digest('hex');
  if (hash(bundle) !== asset.sha256 || hash(map) !== asset.mapSha256)
    throw new Error('附件完整性检查失败。');
  const line = Number(match[2]);
  const column = Number(match[3]);
  const generated = bundle.toString('utf8').split(/\r?\n/)[line - 1];
  if (generated === undefined || column > generated.length)
    throw new Error('帧位置超出 bundle 范围。');
  const payload = JSON.parse(map);
  if (
    payload.version !== 3 ||
    !Array.isArray(payload.sources) ||
    typeof payload.mappings !== 'string'
  )
    throw new Error('source map 格式无效。');
  const sourceMap = new SourceMap(payload);
  const entry = sourceMap.findEntry(line - 1, column - 1);
  const original = sourceMap.findOrigin(line, column);
  if (
    entry.generatedLine !== line - 1 ||
    !original.fileName ||
    !original.lineNumber ||
    !original.columnNumber
  )
    throw new Error('该位置没有源代码映射。');
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
