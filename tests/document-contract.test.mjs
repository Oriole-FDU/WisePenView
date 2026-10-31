import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'document-contract-'));

try {
  const outfile = join(tempDir, 'document-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiRequest, parseApiResponse } from '@/apis/contract';
        export {
          CancelDocProcessApiContract,
          ForkDocumentApiContract,
          GetDocInfoApiContract,
          GetOnlyOfficeEditorConfigApiContract,
          ListPendingDocsApiContract,
          RetryDocProcessApiContract,
          SyncDocStatusApiContract,
          UploadDocApiContract,
        } from '@/domains/Document/apis/DocumentApi.contract';
        export { DocumentApi } from '@/domains/Document/mock/DocumentApi.mock';
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
    CancelDocProcessApiContract,
    DocumentApi,
    ForkDocumentApiContract,
    GetDocInfoApiContract,
    GetOnlyOfficeEditorConfigApiContract,
    ListPendingDocsApiContract,
    parseApiRequest,
    parseApiResponse,
    RetryDocProcessApiContract,
    SyncDocStatusApiContract,
    UploadDocApiContract,
  } = await import(pathToFileURL(outfile).href);

  for (const contract of [UploadDocApiContract, ForkDocumentApiContract]) {
    assert.equal(contract.method, 'POST');
    assert.equal(contract.requestPlacement, 'body');
  }
  for (const contract of [
    GetDocInfoApiContract,
    GetOnlyOfficeEditorConfigApiContract,
    ListPendingDocsApiContract,
  ]) {
    assert.equal(contract.method, 'GET');
  }
  for (const contract of [
    CancelDocProcessApiContract,
    RetryDocProcessApiContract,
    SyncDocStatusApiContract,
  ]) {
    assert.equal(contract.requestPlacement, 'query');
  }

  const uploadRequest = parseApiRequest(UploadDocApiContract, {
    filename: '  数据结构.pdf  ',
    extension: 'pdf',
    md5: '0123456789abcdef0123456789abcdef',
    expectedSize: 2048,
    mountTargetTagId: 'tag-1',
  });
  assert.equal(uploadRequest.filename, '数据结构.pdf');
  assert(
    !UploadDocApiContract.request.safeParse({
      ...uploadRequest,
      extension: 'html',
    }).success
  );
  assert(
    !UploadDocApiContract.request.safeParse({
      ...uploadRequest,
      unknownField: true,
    }).success
  );

  const docInfo = await DocumentApi.getDocInfo({ resourceId: 'mock-note-1' });
  const parsedDocInfo = parseApiResponse(GetDocInfoApiContract, docInfo);
  assert.equal(parsedDocInfo.documentVersionInfo?.version, 1);
  assert.equal(parsedDocInfo.documentVersionInfo?.documentStatus.status, 'READY');
  assert.equal(parsedDocInfo.documentVersionInfo?.uploadMeta.mountTargetTagId, 'tag-root');

  assert(
    GetDocInfoApiContract.response.safeParse({
      ...docInfo,
      documentVersionInfo: null,
    }).success
  );
  assert(
    !GetDocInfoApiContract.response.safeParse({
      ...docInfo,
      documentVersionInfo: {
        ...docInfo.documentVersionInfo,
        documentStatus: { status: 'SUCCESS', errorMessage: null },
      },
    }).success
  );

  const editorConfig = parseApiResponse(GetOnlyOfficeEditorConfigApiContract, {
    sessionId: 'session-1',
    config: { document: { fileType: 'docx' }, editorConfig: {} },
  });
  assert.equal(editorConfig.sessionId, 'session-1');
  assert(
    !GetOnlyOfficeEditorConfigApiContract.response.safeParse({
      sessionId: 'session-1',
      config: [],
    }).success
  );

  console.log('Document API 契约检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
