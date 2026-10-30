import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'chat-stream-contract-'));

try {
  const outfile = join(tempDir, 'chat-stream-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiRequest } from '@/apis/contract';
        export {
          ChatCompletionStreamApiContract,
          ChatReconnectStreamApiContract,
          ChatRecoverStreamApiContract,
        } from '@/domains/Chat/apis/ChatStreamApi.contract';
        export {
          pickChatCompletionApiRequest,
          pickChatRecoverApiRequest,
        } from '@/domains/Chat/apis/ChatStreamApi.schema';
        export { normalizeChatSseData } from '@/domains/Chat/session/chatSseNormalizer';
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
    ChatCompletionStreamApiContract,
    ChatReconnectStreamApiContract,
    ChatRecoverStreamApiContract,
    normalizeChatSseData,
    parseApiRequest,
    pickChatCompletionApiRequest,
    pickChatRecoverApiRequest,
  } = await import(pathToFileURL(outfile).href);

  assert.equal(ChatCompletionStreamApiContract.transport, 'sse');
  assert.equal(ChatRecoverStreamApiContract.transport, 'sse');
  assert.equal(ChatReconnectStreamApiContract.requestPlacement, 'query');

  const completion = parseApiRequest(
    ChatCompletionStreamApiContract,
    pickChatCompletionApiRequest({
      session_id: 'session-1',
      query: '解释这段代码',
      messages: [{ role: 'user', content: 'sdk-only' }],
      tool_selection_default_enabled: true,
      client_tool_capabilities: [
        {
          name: 'open_note',
          description: '打开笔记',
          input_schema: { type: 'object' },
        },
      ],
    })
  );
  assert.equal(completion.session_id, 'session-1');
  assert.equal('messages' in completion, false);

  const recovery = parseApiRequest(
    ChatRecoverStreamApiContract,
    pickChatRecoverApiRequest({
      session_id: 'session-1',
      client_tool_results: [{ tool_call_id: 'tool-1', error_text: '失败' }],
      tool_approval_status: [{ tool_call_id: 'tool-2', approved: true }],
      messages: [],
    })
  );
  assert.equal(recovery.client_tool_results[0].error_text, '失败');
  assert(
    !ChatRecoverStreamApiContract.request.safeParse({
      session_id: 'session-1',
      client_tool_results: [{ tool_call_id: 'tool-1', output: null, error_text: '失败' }],
      tool_approval_status: [],
    }).success
  );

  assert.deepEqual(normalizeChatSseData('[DONE]'), ['[DONE]']);
  assert.deepEqual(normalizeChatSseData('{"type":"text-start","id":"1"}'), [
    '{"type":"text-start","id":"1"}',
  ]);
  assert.throws(() => normalizeChatSseData('{broken'));
  assert.throws(() => normalizeChatSseData('"plain-string"'));

  console.log('Chat Stream API 契约检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
