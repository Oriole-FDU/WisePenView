import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'note-contract-'));

try {
  const outfile = join(tempDir, 'note-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiRequest, parseApiResponse } from '@/apis/contract';
        export {
          AddNoteApiContract,
          ForkNoteApiContract,
          GetDrawIoLatestSnapshotApiContract,
          GetNoteInfoApiContract,
          ListNoteVersionsApiContract,
          SaveDrawIoSnapshotApiContract,
        } from '@/domains/Note/apis/NoteApi.contract';
        export { NoteServicesMap } from '@/domains/Note/mapper/NoteServices.map';
        export { NoteApi } from '@/domains/Note/mock/NoteApi.mock';
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
    AddNoteApiContract,
    ForkNoteApiContract,
    GetDrawIoLatestSnapshotApiContract,
    GetNoteInfoApiContract,
    ListNoteVersionsApiContract,
    NoteApi,
    NoteServicesMap,
    parseApiRequest,
    parseApiResponse,
    SaveDrawIoSnapshotApiContract,
  } = await import(pathToFileURL(outfile).href);

  for (const contract of [AddNoteApiContract, ForkNoteApiContract, SaveDrawIoSnapshotApiContract]) {
    assert.equal(contract.method, 'POST');
    assert.equal(contract.requestPlacement, 'body');
  }
  for (const contract of [
    GetDrawIoLatestSnapshotApiContract,
    GetNoteInfoApiContract,
    ListNoteVersionsApiContract,
  ]) {
    assert.equal(contract.method, 'GET');
    assert.equal(contract.requestPlacement, 'query');
  }

  const addRequest = parseApiRequest(AddNoteApiContract, {
    title: '  新笔记  ',
    resourceType: 'NOTE',
  });
  assert.equal(addRequest.title, '新笔记');
  assert(!AddNoteApiContract.request.safeParse({ title: '非法类型', resourceType: 'PDF' }).success);

  const noteInfo = await NoteApi.getNoteInfo({ resourceId: 'mock-note-1' });
  const parsedNoteInfo = parseApiResponse(GetNoteInfoApiContract, noteInfo);
  assert.equal(parsedNoteInfo.updateTime, Date.parse('2026-03-01T00:00:00Z'));
  assert.equal(parsedNoteInfo.authorsDisplay?.['1']?.nickname, '示例用户');
  assert.equal(parsedNoteInfo.resourceInfo.resourceType, 'NOTE');
  assert(
    !GetNoteInfoApiContract.response.safeParse({
      ...noteInfo,
      updateTime: '2026-03-01T00:00:00Z',
    }).success
  );

  const display = NoteServicesMap.mapNoteInfoDisplayFromApi(parsedNoteInfo);
  assert.equal(display.noteTitle, '课程导学');
  assert.equal(display.authors[0]?.id, '1');
  assert.notEqual(display.lastEditedAtText, '');

  const snapshot = parseApiResponse(GetDrawIoLatestSnapshotApiContract, {
    resourceId: 'drawio-1',
    version: 3,
    fullSnapshot: 'PHhtbD48L3htbD4=',
    deltas: null,
  });
  assert.equal(snapshot.version, 3);

  assert(
    SaveDrawIoSnapshotApiContract.request.safeParse({
      resourceId: 'drawio-1',
      version: 3,
      data: 'PHhtbD48L3htbD4=',
      type: 'FULL',
    }).success === false
  );

  const versionResponse = {
    list: [
      {
        version: 2,
        type: 'DELTA',
        createdBy: ['10086'],
      },
    ],
    total: '1',
    page: 1,
    size: 20,
    totalPage: 1,
  };
  const parsedVersions = parseApiResponse(ListNoteVersionsApiContract, versionResponse);
  assert.equal(parsedVersions.total, 1);
  assert.deepEqual(parsedVersions.list[0].createdBy, ['10086']);
  assert(
    !ListNoteVersionsApiContract.response.safeParse({
      ...versionResponse,
      list: [{ ...versionResponse.list[0], createdBy: [10086] }],
    }).success
  );

  console.log('Note API 契约检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
