import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';
import ts from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'check-api-contract-'));

const collectFiles = async (dir, predicate) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) return collectFiles(fullPath, predicate);
      return predicate(fullPath) ? [fullPath] : [];
    })
  );
  return files.flat();
};

const responseOptionalAllowlist = new Set([
  // 孤儿管理接口：后端尚未实现，待产品确认补接口或下线页面。
  'AdminMessageApiModel',
  // Python Cloud-AI 外部契约，等待 Cloud-AI 侧统一 required/nullable。
  'MessageResponse',
  'ToolApiResponse',
  'ProviderApiResponse',
  'ModelProviderMappingResponse',
  'ModelResponse',
  'InitTemporaryAttachmentUploadApiResponse',
]);

const assertResponseTypesDoNotUseOptional = async () => {
  const files = await collectFiles(
    join(root, 'src/domains'),
    (file) => file.includes('/apis/') && file.endsWith('.type.ts')
  );
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      await readFile(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    source.forEachChild((node) => {
      if (!ts.isInterfaceDeclaration(node) || !/(Response|ApiModel)$/.test(node.name.text)) {
        return;
      }
      if (responseOptionalAllowlist.has(node.name.text)) return;
      for (const member of node.members) {
        if (!ts.isPropertySignature(member) || !member.questionToken) continue;
        assert.fail(
          `${relative(root, file)} 的响应类型 ${node.name.text}.${member.name.getText(source)} 不能使用 optional`
        );
      }
    });
  }
};

const assertNoLegacyCompatibilityAliases = async () => {
  const files = await collectFiles(join(root, 'src'), (file) => file.endsWith('.ts'));
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert(
      !/\b(NumericEnumApiValue|JavaLongApiValue)\b/.test(source),
      `${relative(root, file)} 仍引用已删除的兼容别名`
    );
    if (file.includes('/apis/') && !file.endsWith('AdminMessageApi.type.ts')) {
      assert(
        !/\bstring\s*\|\s*number\b|\bnumber\s*\|\s*string\b/.test(source),
        `${relative(root, file)} 的 API 类型仍使用 string | number`
      );
    }
  }
};

try {
  const outfile = join(tempDir, 'runtime-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `export { isApiResponseEnvelope } from '@/apis/runtimeContract';`,
      resolveDir: root,
    },
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    alias: { '@': join(root, 'src') },
  });

  const { isApiResponseEnvelope } = await import(pathToFileURL(outfile).href);
  assert(isApiResponseEnvelope({ code: 200, key: 'SUCCESS', msg: '操作成功', data: null }));
  assert(isApiResponseEnvelope({ code: 200, msg: 'ok', data: { id: 'resource' } }));
  assert(!isApiResponseEnvelope({ code: 200, key: null, msg: 'ok', data: null }));
  assert(!isApiResponseEnvelope({ code: 200, key: '', msg: 'ok', data: null }));
  assert(!isApiResponseEnvelope({ code: 200, key: 'SUCCESS', msg: '', data: null }));
  assert(!isApiResponseEnvelope({ code: 200, msg: '', data: null }));
  assert(!isApiResponseEnvelope({ code: Number.NaN, msg: 'ok', data: null }));
  assert(!isApiResponseEnvelope({ code: Number.POSITIVE_INFINITY, msg: 'ok', data: null }));
  assert(!isApiResponseEnvelope({ code: '200', msg: 'ok', data: null }));
  assert(!isApiResponseEnvelope({ code: 200, msg: 0, data: null }));
  assert(!isApiResponseEnvelope({ code: 200, key: 1, msg: 'ok', data: null }));
  assert(!isApiResponseEnvelope({ code: 200, msg: null, data: null }));
  assert(!isApiResponseEnvelope({ code: 200, key: 'java', msg: 0, data: null }));
  assert(!isApiResponseEnvelope([]));
  await assertNoLegacyCompatibilityAliases();
  await assertResponseTypesDoNotUseOptional();
  console.log('API response envelope 契约离线检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
