import assert from 'node:assert/strict';
import { test } from 'node:test';

import { build } from 'esbuild';

const bundled = await build({
  entryPoints: ['src/frontendState/registry.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  tsconfig: 'tsconfig.app.json',
  write: false,
});
const { createFrontendStateRegistry } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].contents).toString('base64')}`
);
const mapped = await build({
  entryPoints: ['src/domains/Chat/mapper/chatCompletion.mapper.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  tsconfig: 'tsconfig.app.json',
  write: false,
});
const { mapChatCompletionRequest } = await import(
  `data:text/javascript;base64,${Buffer.from(mapped.outputFiles[0].contents).toString('base64')}`
);

function createRegistry() {
  let reads = 0;
  const registry = createFrontendStateRegistry(() => ({
    time: { iso: `time-${++reads}`, local: 'local', timezone: 'Asia/Shanghai' },
    locale: reads === 1 ? 'zh-CN' : 'en-US',
  }));
  return registry;
}

test('按现有顺序读取七个 key，并在每次发送时更新内置值', () => {
  const registry = createRegistry();
  registry.setFrontendStates({
    source: 'resource',
    resourceId: 'note-1',
    entries: [
      { key: 'workspace_open_resource', value: { resource_id: 'note-1', resource_type: 'note' } },
    ],
  });
  registry.setFrontendStates({
    source: 'note-editor',
    resourceId: 'note-1',
    entries: [{ key: 'note_client_content_signature', value: 'signature', disabled: true }],
  });
  registry.setFrontendStates({
    source: 'selection',
    resourceId: 'note-1',
    entries: [
      { key: 'selected_text', value: 'text' },
      { key: 'selected_note_scope', value: { type: 'blocks', block_ids: ['block-1'] } },
    ],
  });
  registry.setFrontendStates({
    source: 'input',
    entries: [
      {
        key: 'selected_resources',
        value: [{ resource_id: 'doc-1', resource_name: 'Doc', resource_type: 'note' }],
      },
    ],
  });

  const first = registry.readFrontendStates({ resourceId: 'note-1' });
  assert.deepEqual(
    first.states.map(({ key }) => key),
    [
      'workspace_open_resource',
      'note_client_content_signature',
      'selected_text',
      'selected_note_scope',
      'selected_resources',
      'time',
      'locale',
    ]
  );
  assert.equal(first.states[1].disabled, true);
  assert.equal(first.states[5].value.iso, 'time-1');
  const second = registry.readFrontendStates({ resourceId: 'note-1' });
  assert.equal(second.states[5].value.iso, 'time-2');
  assert.equal(second.states[6].value, 'en-US');
});

test('资源隔离；旧选区阻断发送，旧编辑器签名不进入请求', () => {
  const registry = createRegistry();
  registry.setFrontendStates({
    source: 'selection',
    resourceId: 'note-1',
    entries: [{ key: 'selected_text', value: 'old' }],
  });
  registry.setFrontendStates({
    source: 'note-editor',
    resourceId: 'note-1',
    entries: [{ key: 'note_client_content_signature', value: 'old', disabled: true }],
  });
  const nextResource = registry.readFrontendStates({ resourceId: 'note-2' });
  assert.equal(nextResource.resourceMismatch, true);
  assert.deepEqual(
    nextResource.states.map(({ key }) => key),
    ['time', 'locale']
  );
});

test('整组替换移除旧范围，过期组件不能清掉新值', () => {
  const registry = createRegistry();
  const oldRevision = registry.setFrontendStates({
    source: 'selection',
    resourceId: 'note-1',
    entries: [
      { key: 'selected_text', value: 'old' },
      { key: 'selected_note_scope', value: { type: 'blocks', block_ids: ['a'] } },
    ],
  });
  registry.setFrontendStates({
    source: 'selection',
    resourceId: 'note-1',
    entries: [{ key: 'selected_text', value: 'new' }],
  });
  registry.clearFrontendStates({ source: 'selection', revision: oldRevision });
  assert.deepEqual(
    registry.readFrontendStates({ resourceId: 'note-1' }).states.map(({ key }) => key),
    ['selected_text', 'time', 'locale']
  );
  assert.equal(registry.getFrontendStateValue('selected_text'), 'new');
});

test('发送完成仅清除读取时的选区和输入引用', () => {
  const registry = createRegistry();
  registry.setFrontendStates({
    source: 'selection',
    resourceId: 'note-1',
    entries: [{ key: 'selected_text', value: 'old' }],
  });
  registry.setFrontendStates({
    source: 'input',
    entries: [{ key: 'selected_resources', value: [] }],
  });
  const snapshot = registry.readFrontendStates({ resourceId: 'note-1' });
  registry.setFrontendStates({
    source: 'selection',
    resourceId: 'note-1',
    entries: [{ key: 'selected_text', value: 'new' }],
  });
  registry.setFrontendStates({
    source: 'input',
    entries: [
      {
        key: 'selected_resources',
        value: [{ resource_id: 'new', resource_name: 'New', resource_type: 'note' }],
      },
    ],
  });
  snapshot.finishSend();
  assert.equal(registry.getFrontendStateValue('selected_text'), 'new');
  assert.equal(registry.getFrontendStateValue('selected_resources')[0].resource_id, 'new');
  registry.readFrontendStates({ resourceId: 'note-1' }).finishSend();
  assert.equal(registry.getFrontendStateValue('selected_resources'), undefined);
});

test('重复 key 被拒绝；tab reset 清空全部状态', () => {
  const registry = createRegistry();
  registry.setFrontendStates({
    source: 'selection',
    entries: [{ key: 'selected_text', value: 'text' }],
  });
  assert.throws(() =>
    registry.setFrontendStates({
      source: 'other',
      entries: [{ key: 'selected_text', value: 'duplicate' }],
    })
  );
  registry.reset();
  assert.equal(registry.getFrontendStateValue('selected_text'), undefined);
});

test('请求 mapper 原样序列化读取结果，不额外生成 key', () => {
  const registry = createRegistry();
  registry.setFrontendStates({
    source: 'selection',
    resourceId: 'note-1',
    entries: [{ key: 'selected_text', value: '选区' }],
  });
  const snapshot = registry.readFrontendStates({ resourceId: 'note-1' });
  const request = mapChatCompletionRequest({
    defaultSessionId: 'session-1',
    query: '提问',
    options: { frontendStates: snapshot.states },
  });
  assert.deepEqual(request.frontend_states, snapshot.states);
  assert.equal(request.frontend_states.length, 3);
  assert.equal(
    mapChatCompletionRequest({ defaultSessionId: 'session-1', query: '提问' }).frontend_states,
    undefined
  );
});
