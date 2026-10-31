import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'inline-comment-contract-'));

try {
  const outfile = join(tempDir, 'inline-comment-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiRequest, parseApiResponse } from '@/apis/contract';
        export {
          AddInlineCommentItemApiContract,
          ChangeInlineCommentResolveStatusApiContract,
          CreateInlineCommentApiContract,
          DeleteInlineCommentItemApiContract,
          DeleteInlineCommentItemReactionApiContract,
          ListInlineCommentsApiContract,
          SetInlineCommentItemReactionApiContract,
          UpdateInlineCommentItemApiContract,
        } from '@/domains/InlineComment/apis/InlineCommentApi.contract';
        export { InlineCommentApi } from '@/domains/InlineComment/mock/InlineCommentApi.mock';
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
    AddInlineCommentItemApiContract,
    ChangeInlineCommentResolveStatusApiContract,
    CreateInlineCommentApiContract,
    DeleteInlineCommentItemApiContract,
    DeleteInlineCommentItemReactionApiContract,
    InlineCommentApi,
    ListInlineCommentsApiContract,
    parseApiRequest,
    parseApiResponse,
    SetInlineCommentItemReactionApiContract,
    UpdateInlineCommentItemApiContract,
  } = await import(pathToFileURL(outfile).href);

  const contracts = [
    AddInlineCommentItemApiContract,
    ChangeInlineCommentResolveStatusApiContract,
    CreateInlineCommentApiContract,
    DeleteInlineCommentItemApiContract,
    DeleteInlineCommentItemReactionApiContract,
    ListInlineCommentsApiContract,
    SetInlineCommentItemReactionApiContract,
    UpdateInlineCommentItemApiContract,
  ];
  assert.equal(new Set(contracts.map((contract) => contract.endpoint)).size, 8);

  const createRequest = parseApiRequest(CreateInlineCommentApiContract, {
    resourceId: 'mock-note-1',
    externalAnchorId: 'anchor-1',
    quoteText: '原文',
    anchorPayload: { start: 'a', end: 'b' },
    contentVersion: 2,
    content: '  这是一条批注  ',
    imageUrls: [],
    mentionUserIds: [],
  });
  assert.equal(createRequest.content, '这是一条批注');
  assert.deepEqual(createRequest.anchorPayload, { start: 'a', end: 'b' });

  assert(
    !DeleteInlineCommentItemReactionApiContract.request.safeParse({
      resourceId: 'mock-note-1',
      inlineCommentId: 'thread-1',
      itemId: 'item-1',
    }).success
  );

  const threadId = await InlineCommentApi.createInlineComment(createRequest);
  const threads = parseApiResponse(
    ListInlineCommentsApiContract,
    await InlineCommentApi.listInlineComments({ resourceId: 'mock-note-1' })
  );
  assert.equal(threads[0].inlineCommentId, threadId);
  assert.equal(threads[0].anchorRef?.externalAnchorId, 'anchor-1');
  assert.equal(threads[0].items[0].content, '这是一条批注');
  assert.deepEqual(threads[0].items[0].reactions, {});
  assert.equal(threads[0].resolved, false);

  assert(
    !ListInlineCommentsApiContract.response.safeParse([
      {
        ...threads[0],
        items: [
          {
            ...threads[0].items[0],
            reactions: { 1: { emojiId: '👍', createTime: Date.now() } },
          },
        ],
      },
    ]).success
  );

  console.log('InlineComment API 契约检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
