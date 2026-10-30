import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'html-page-contract-'));

try {
  const outfile = join(tempDir, 'html-page-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiResponse } from '@/apis/contract';
        export {
          GetSingleHtmlPageContentApiContract,
          GetSingleHtmlPageInfoApiContract,
        } from '@/domains/HtmlPage/apis/HtmlPageApi.contract';
        export { HtmlPageApi } from '@/domains/HtmlPage/mock/HtmlPageApi.mock';
      `,
      resolveDir: root,
    },
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    alias: { '@': join(root, 'src') },
  });

  const {
    GetSingleHtmlPageContentApiContract,
    GetSingleHtmlPageInfoApiContract,
    HtmlPageApi,
    parseApiResponse,
  } = await import(pathToFileURL(outfile).href);

  assert.equal(GetSingleHtmlPageInfoApiContract.method, 'POST');
  assert.equal(GetSingleHtmlPageInfoApiContract.requestPlacement, 'query');
  assert.equal(GetSingleHtmlPageContentApiContract.method, 'GET');
  assert.equal(GetSingleHtmlPageContentApiContract.transport, 'text');

  const info = parseApiResponse(
    GetSingleHtmlPageInfoApiContract,
    await HtmlPageApi.getSingleHtmlPageInfo({ resourceId: 'mock-html-page' })
  );
  assert.equal(info.resourceInfo.resourceType, 'SINGLE_HTML_PAGE');
  assert.equal(info.versionInfo?.singleHtmlPageStatus, 'READY');
  assert.equal(typeof info.versionInfo?.updateTime, 'number');
  assert(
    !GetSingleHtmlPageInfoApiContract.response.safeParse({
      ...info,
      versionInfo: { ...info.versionInfo, singleHtmlPageStatus: 'SUCCESS' },
    }).success
  );

  const html = parseApiResponse(
    GetSingleHtmlPageContentApiContract,
    await HtmlPageApi.getSingleHtmlPageContent({ resourceId: 'mock-html-page' })
  );
  assert.match(html, /<!doctype html>/i);

  console.log('HtmlPage API 契约检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
