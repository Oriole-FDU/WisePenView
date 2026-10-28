import assert from 'node:assert/strict';
import { test } from 'node:test';

import { build } from 'esbuild';

/**
 * 原文引用协议与定位请求的离线检查。
 *
 * 覆盖 chat 点击分发依赖的纯逻辑：协议解析、动作判定、定位请求的有效性与覆盖规则。
 */
async function bundle(entryPoint) {
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'node',
    format: 'esm',
    tsconfig: 'tsconfig.app.json',
    write: false,
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`
  );
}

const protocolModule = await bundle('src/components/editors/note/noteLinkProtocol.ts');
const modelModule = await bundle('src/components/editors/note/noteExternalNavigationModel.ts');
const storeModule = await bundle(
  'src/components/editors/note/_store/useNoteExternalNavigationStore.ts'
);

const { buildNoteLinkUrl, parseNoteLinkUrl, resolveNoteLinkAction } = protocolModule;
const {
  NOTE_EXTERNAL_NAVIGATION_REQUEST_TTL_MS,
  createNoteExternalNavigationRequest,
  isNoteExternalNavigationRequestExpired,
} = modelModule;
const { useNoteExternalNavigationStore } = storeModule;

test('解析合法原文链接：单段 id、锚点前缀与编码', () => {
  assert.deepEqual(parseNoteLinkUrl('wisepen://note/mock-note-2#p_linear-list-array'), {
    resourceId: 'mock-note-2',
    blockId: 'linear-list-array',
  });
  assert.deepEqual(parseNoteLinkUrl('  wisepen://note/n-1#p_blk  '), {
    resourceId: 'n-1',
    blockId: 'blk',
  });
  assert.deepEqual(parseNoteLinkUrl('WISEPEN://NOTE/n-1#p_blk'), {
    resourceId: 'n-1',
    blockId: 'blk',
  });
  assert.deepEqual(parseNoteLinkUrl('wisepen://note/mock%2Dnote%2D2#p_block%20id'), {
    resourceId: 'mock-note-2',
    blockId: 'block id',
  });
});

test('拒绝非法形态：协议、主机、路径与锚点前缀', () => {
  for (const url of [
    '',
    '   ',
    'https://note/mock-note-2#p_linear-list-array',
    'wisepen://skill/mock-skill-1',
    'wisepen://note/mock-note-2',
    'wisepen://note/mock-note-2#linear-list-array',
    'wisepen://note/mock-note-2#p_',
    'wisepen://note/mock-note-2#p_%20',
    'wisepen://note/',
    'wisepen://note/folder/mock-note-2#p_block',
    'wisepen://note/mock-note-2/#p_block',
    'wisepen://user:pass@note/mock-note-2#p_block',
    'wisepen://note:8080/mock-note-2#p_block',
    'note/mock-note-2#p_block',
  ]) {
    assert.equal(parseNoteLinkUrl(url), null, `应拒绝：${url}`);
  }
});

test('生成链接可被解析，查询串被忽略', () => {
  const url = buildNoteLinkUrl({ resourceId: 'mock note', blockId: 'block/1' });
  assert.equal(url, 'wisepen://note/mock%20note#p_block%2F1');
  assert.deepEqual(parseNoteLinkUrl(url), { resourceId: 'mock note', blockId: 'block/1' });
  assert.deepEqual(parseNoteLinkUrl('wisepen://note/n-1?from=chat#p_blk'), {
    resourceId: 'n-1',
    blockId: 'blk',
  });
});

test('动作判定：当前笔记相同只滚动，否则先打开', () => {
  assert.equal(resolveNoteLinkAction({ currentNoteId: 'a', targetNoteId: 'a' }), 'scroll');
  assert.equal(resolveNoteLinkAction({ currentNoteId: 'a', targetNoteId: 'b' }), 'open');
  assert.equal(resolveNoteLinkAction({ currentNoteId: null, targetNoteId: 'b' }), 'open');
  assert.equal(resolveNoteLinkAction({ currentNoteId: undefined, targetNoteId: 'b' }), 'open');
  assert.equal(resolveNoteLinkAction({ currentNoteId: '  ', targetNoteId: 'b' }), 'open');
  assert.equal(resolveNoteLinkAction({ currentNoteId: ' a ', targetNoteId: 'a' }), 'scroll');
});

test('定位请求按有效期判定过期', () => {
  const request = createNoteExternalNavigationRequest(
    { resourceId: 'n-1', blockId: 'blk' },
    1,
    1_000
  );
  assert.equal(request.expiresAt, 1_000 + NOTE_EXTERNAL_NAVIGATION_REQUEST_TTL_MS);
  assert.equal(isNoteExternalNavigationRequestExpired(request, 1_000), false);
  assert.equal(isNoteExternalNavigationRequestExpired(request, request.expiresAt - 1), false);
  assert.equal(isNoteExternalNavigationRequestExpired(request, request.expiresAt), true);
  assert.equal(isNoteExternalNavigationRequestExpired(request, request.expiresAt + 5_000), true);
});

test('定位请求被新请求覆盖，且只能消费自身 requestId', () => {
  const store = useNoteExternalNavigationStore.getState();
  assert.equal(store.pending, null);

  const first = store.requestExternalNavigation({ resourceId: 'n-1', blockId: 'blk-1' });
  const second = useNoteExternalNavigationStore
    .getState()
    .requestExternalNavigation({ resourceId: 'n-2', blockId: 'blk-2' });
  assert.equal(second.requestId, first.requestId + 1);
  assert.deepEqual(
    {
      resourceId: useNoteExternalNavigationStore.getState().pending?.resourceId,
      blockId: useNoteExternalNavigationStore.getState().pending?.blockId,
    },
    { resourceId: 'n-2', blockId: 'blk-2' }
  );

  // 旧请求的消费不能清掉新请求
  useNoteExternalNavigationStore.getState().consumeExternalNavigation(first.requestId);
  assert.equal(useNoteExternalNavigationStore.getState().pending?.requestId, second.requestId);

  useNoteExternalNavigationStore.getState().consumeExternalNavigation(second.requestId);
  assert.equal(useNoteExternalNavigationStore.getState().pending, null);
});
