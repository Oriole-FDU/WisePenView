import assert from 'node:assert/strict';
import { test } from 'node:test';

import { build } from 'esbuild';

async function bundle(path) {
  const result = await build({
    entryPoints: [path],
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
const [
  runtimeModule,
  hostModule,
  draftModule,
  promptsModule,
  officeModule,
  drawioModule,
  presentationModule,
  noteContentPresenceModule,
] = await Promise.all([
  bundle('src/components/editors/_runtime/editorRuntime.ts'),
  bundle('src/components/editors/_runtime/editorHost.ts'),
  bundle('src/components/editors/_runtime/draftExit.ts'),
  bundle('src/components/editors/_runtime/editorExitPrompt.ts'),
  bundle('src/components/editors/office/officeSession.ts'),
  bundle('src/components/editors/drawio/drawioSaveSession.ts'),
  bundle(
    'src/views/app/resource/ResourceTargetResolver/_components/ResourceEditorWorkspace/workspacePresentationStore.ts'
  ),
  bundle('src/components/editors/note/noteContentPresence.ts'),
]);
const { createEditorRuntime, waitForEditor } = runtimeModule;
const { createEditorHost } = hostModule;
const { prepareDraftExit } = draftModule;
const { createEditorExitPrompt } = promptsModule;
const { prepareOfficeExit, reduceOfficeSession, isOfficeReadOnly } = officeModule;
const { createDrawioSaveSession } = drawioModule;
const { createWorkspacePresentationStore } = presentationModule;
const { isNoteBodyEmpty, isNoteTitleEmpty } = noteContentPresenceModule;
const prompt = {
  title: '未保存',
  description: '保存后离开',
  confirmText: '保存',
  discardText: '丢弃',
};
const initial = {
  openedResource: { resourceId: 'a', resourceType: 'note', viewer: 'note' },
  loading: true,
  readOnly: true,
  hasUnsavedChanges: false,
  pendingWork: false,
  warnBeforeUnload: false,
};
const snapshot = (patch = {}) => ({ ...initial, loading: false, readOnly: false, ...patch });
const createRuntime = () => createEditorRuntime('a', 'note', initial);
const context = (confirm = async () => 'cancel', signal = new AbortController().signal) => ({
  reason: 'leave-page',
  signal,
  confirm,
});
const flush = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((success, failure) => {
    resolve = success;
    reject = failure;
  });
  return { promise, resolve, reject };
}

test('会话注销撤销完整快照与策略，错误页仍可再次退出', async () => {
  const runtime = createRuntime();
  runtime.updateLoad({ loading: false, error: '首次加载失败' });
  const session = runtime.registerSession(
    snapshot({
      pendingWork: true,
      hasUnsavedChanges: true,
      warnBeforeUnload: true,
      activeFile: { id: 'x', path: '/x' },
    }),
    (ctx) => waitForEditor(runtime.editor, (state) => !state.pendingWork, ctx.signal)
  );
  const exit = runtime.editor.prepareExit(context());
  await flush();
  session.dispose();
  assert.equal(await exit, false);
  assert.deepEqual(runtime.editor.getSnapshot(), {
    ...initial,
    loading: false,
    error: '首次加载失败',
    activeFile: undefined,
  });
  assert.equal(await runtime.editor.prepareExit(context()), true);
});

test('替换会话中止旧退出；旧更新与注销不能污染新会话', async () => {
  const runtime = createRuntime();
  const late = deferred();
  const previous = runtime.registerSession(
    snapshot({ hasUnsavedChanges: true }),
    () => late.promise
  );
  const exit = runtime.editor.prepareExit(context());
  await flush();
  const current = snapshot({ openedResource: { ...initial.openedResource, version: 2 } });
  runtime.registerSession(current);
  previous.update(snapshot({ pendingWork: true }));
  previous.dispose();
  late.resolve(true);
  assert.equal(await exit, false);
  assert.deepEqual(runtime.editor.getSnapshot(), current);
});

test('入口请求变化不覆盖活动会话，等价字段不重复通知，可处理循环错误对象', () => {
  const runtime = createRuntime();
  let count = 0;
  runtime.editor.subscribe(() => {
    count += 1;
  });
  const error = {};
  error.cause = error;
  const state = snapshot({ error, activeFile: { id: 'x', path: '/x' } });
  const session = runtime.registerSession(state);
  runtime.updateLoad({ loading: true, error: '刷新失败' });
  session.update({
    ...state,
    openedResource: { ...state.openedResource },
    activeFile: { ...state.activeFile },
  });
  assert.equal(count, 1);
  session.update({ ...state, activeFile: { id: 'x', path: '/new' } });
  assert.equal(count, 2);
});

test('Host 合并并发退出，取消后迟到的保存不能恢复导航', async () => {
  const runtime = createRuntime();
  const late = deferred();
  let calls = 0;
  runtime.registerSession(snapshot(), () => {
    calls += 1;
    return late.promise;
  });
  const host = createEditorHost();
  host.register(runtime.editor);
  const first = host.requestExit('leave-page', async () => 'save');
  const second = host.requestExit('switch-viewer', async () => 'save');
  assert.equal(first, second);
  await flush();
  host.cancelExit();
  assert.equal(await first, false);
  late.resolve(true);
  await flush();
  assert.equal(calls, 1);
});

test('保存失败或保存期间产生新修改不放行，成功保存才放行', async () => {
  for (const outcome of ['success', 'failure', 'new-change']) {
    const runtime = createRuntime();
    const session = runtime.registerSession(snapshot({ hasUnsavedChanges: true }));
    const allowed = await prepareDraftExit(
      runtime.editor,
      context(async () => 'save'),
      prompt,
      {
        save: async () => {
          if (outcome === 'failure') throw new Error('保存失败');
          session.update(snapshot({ hasUnsavedChanges: outcome === 'new-change' }));
        },
        discard: async () => {},
      }
    ).catch(() => false);
    assert.equal(allowed, outcome === 'success');
  }
});

test('保存中先等待；取消退出不取消领域保存；丢弃不会调用保存', async () => {
  const runtime = createRuntime();
  const session = runtime.registerSession(snapshot({ pendingWork: true, hasUnsavedChanges: true }));
  const controller = new AbortController();
  let confirmations = 0;
  const exit = prepareDraftExit(
    runtime.editor,
    context(async () => {
      confirmations += 1;
      return 'save';
    }, controller.signal),
    prompt,
    { save: async () => {}, discard: async () => {} }
  );
  controller.abort();
  assert.equal(await exit, false);
  assert.equal(confirmations, 0);
  assert.equal(runtime.editor.getSnapshot().pendingWork, true);
  session.update(snapshot({ hasUnsavedChanges: true }));
  let discarded = false;
  assert.equal(
    await prepareDraftExit(
      runtime.editor,
      context(async () => 'discard'),
      prompt,
      {
        save: async () => assert.fail('不能保存'),
        discard: async () => {
          discarded = true;
        },
      }
    ),
    true
  );
  assert.equal(discarded, true);
});

test('连续退出时旧请求清理不能关闭新提示，失效请求不能再创建提示', async () => {
  const prompts = createEditorExitPrompt();
  const previous = prompts.createRequest();
  const first = previous.confirm(prompt);
  const current = prompts.createRequest();
  const nextPrompt = { ...prompt, title: '第二次退出' };
  const second = current.confirm(nextPrompt);
  assert.equal(await first, 'cancel');
  previous.dispose();
  assert.equal(prompts.getSnapshot(), nextPrompt);
  assert.equal(await previous.confirm(prompt), 'cancel');
  prompts.choose('save');
  assert.equal(await second, 'save');
  assert.equal(prompts.getSnapshot(), undefined);
});

test('Office 布尔事件准确记录未同步修改，权限与加载状态独立', () => {
  let state = { ready: false, modified: false };
  state = reduceOfficeSession(state, { type: 'ready' });
  state = reduceOfficeSession(state, { type: 'modified', event: { data: true } });
  assert.equal(state.ready, true);
  assert.equal(state.modified, true);
  assert.equal(reduceOfficeSession(state, { type: 'modified', event: {} }), state);
  state = reduceOfficeSession(state, { type: 'error', error: '断线' });
  assert.equal(state.modified, true);
  state = reduceOfficeSession(state, { type: 'modified', event: { data: false } });
  assert.equal(state.modified, false);
  assert.equal(isOfficeReadOnly({ editorConfig: { mode: 'view' } }), true);
  assert.equal(isOfficeReadOnly({ document: { permissions: { edit: false } } }), true);
  assert.equal(
    isOfficeReadOnly({ editorConfig: { mode: 'edit' }, document: { permissions: { edit: true } } }),
    false
  );
});

test('Office 等待修改同步，可取消；同步期间错误不放行', async () => {
  for (const outcome of ['sync', 'cancel', 'error']) {
    const runtime = createRuntime();
    const session = runtime.registerSession(
      snapshot({ hasUnsavedChanges: true, pendingWork: true })
    );
    const controller = new AbortController();
    const exit = prepareOfficeExit(runtime.editor, context(undefined, controller.signal));
    if (outcome === 'sync') session.update(snapshot());
    if (outcome === 'cancel') controller.abort();
    if (outcome === 'error')
      session.update(snapshot({ hasUnsavedChanges: true, error: '同步失败' }));
    assert.equal(await exit, outcome === 'sync');
  }
});

function createDrawio(persistXml = async () => {}) {
  let exports = 0;
  const session = createDrawioSaveSession({
    initialXml: 'initial',
    initialVersion: 1,
    exportXml: () => {
      exports += 1;
    },
    persistXml,
    createFailure: () => new Error('导出失败'),
  });
  return { session, exports: () => exports };
}

test('Drawio 保存 Promise 覆盖导出和持久化；并发保存只导出一次', async () => {
  const persisted = deferred();
  const { session, exports } = createDrawio(() => persisted.promise);
  session.observeXml('a');
  const save = session.requestSave();
  assert.equal(session.requestSave(), save);
  assert.equal(exports(), 1);
  session.receiveExport('a');
  let completed = false;
  void save.then(() => {
    completed = true;
  });
  await flush();
  assert.equal(completed, false);
  persisted.resolve();
  await save;
  assert.deepEqual(session.getSnapshot(), { version: 2, saveState: 'saved', error: undefined });
  session.dispose();
});

test('Drawio 保存期间新增修改不能被旧保存覆盖', async () => {
  const persisted = deferred();
  const { session } = createDrawio(() => persisted.promise);
  session.observeXml('a');
  const save = session.requestSave();
  session.receiveExport('a');
  session.observeXml('b');
  persisted.resolve();
  await save;
  assert.equal(session.getSnapshot().saveState, 'dirty');
  assert.equal(session.getSnapshot().version, 2);
  session.dispose();
});

test('Drawio 导出等待期间新增修改不能被导出响应覆盖', async () => {
  const { session } = createDrawio();
  session.observeXml('a');
  const save = session.requestSave();
  session.observeXml('b');
  session.receiveExport('a');
  await save;
  assert.equal(session.getSnapshot().saveState, 'dirty');
  session.dispose();
});

test('Drawio 保存失败拒绝任务并保留失败状态，下一次可重试', async () => {
  let fail = true;
  const { session } = createDrawio(async () => {
    if (fail) throw new Error('保存失败');
  });
  session.observeXml('a');
  const save = session.requestSave();
  session.receiveExport('a');
  await assert.rejects(save, /保存失败/);
  assert.equal(session.getSnapshot().saveState, 'failed');
  fail = false;
  const retry = session.requestSave();
  session.receiveExport('a');
  await retry;
  assert.equal(session.getSnapshot().saveState, 'saved');
  session.dispose();
});

test('Drawio 导出超时拒绝任务，迟到响应和已销毁任务不能更新状态', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { session } = createDrawio();
  session.observeXml('a');
  const save = session.requestSave();
  const rejected = assert.rejects(save, /导出失败/);
  t.mock.timers.tick(10_000);
  await rejected;
  session.receiveExport('a');
  assert.equal(session.getSnapshot().saveState, 'failed');
  session.dispose();
});

test('Drawio 生命周期重挂允许重新保存，旧后端响应不能写入新任务', async () => {
  const late = deferred();
  let calls = 0;
  const { session } = createDrawio(() => (++calls === 1 ? late.promise : Promise.resolve()));
  session.observeXml('a');
  const save = session.requestSave();
  session.receiveExport('a');
  const rejected = assert.rejects(save);
  session.dispose();
  await rejected;
  session.activate();
  const next = session.requestSave();
  session.receiveExport('a');
  await next;
  late.resolve();
  await flush();
  assert.equal(session.getSnapshot().version, 2);
  session.dispose();
});

test('展示信息直接替换，旧绑定注销不清空新绑定，最后注销释放展示', () => {
  const store = createWorkspacePresentationStore();
  const seen = [];
  store.subscribe((state) => seen.push(state.presentation));
  const first = { className: 'first' };
  const second = { className: 'second' };
  const unregisterFirst = store.getState().onPresentationChange(first);
  const unregisterSecond = store.getState().onPresentationChange(second);
  unregisterFirst();
  assert.deepEqual(seen, [first, second]);
  assert.equal(store.getState().presentation, second);
  unregisterSecond();
  assert.deepEqual(store.getState().presentation, {});
});

test('标题空白或默认为占位文案时判定为空', () => {
  assert.equal(isNoteTitleEmpty(undefined, '未命名笔记'), true);
  assert.equal(isNoteTitleEmpty('  \u200b ', '未命名笔记'), true);
  assert.equal(isNoteTitleEmpty(' 未命名笔记 ', 'Untitled note'), true);
  assert.equal(isNoteTitleEmpty('Untitled note', '未命名笔记'), true);
  assert.equal(isNoteTitleEmpty('项目计划', '未命名笔记'), false);
});

test('正文仅有一个空 paragraph 块或仅剩 BlockNote 尾随空段时判定为空', () => {
  assert.equal(
    isNoteBodyEmpty([{ type: 'paragraph', props: {}, content: [], children: [] }]),
    true
  );
  assert.equal(
    isNoteBodyEmpty([
      {
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: ' \n\t ', styles: {} }],
        children: [],
      },
    ]),
    true
  );
  assert.equal(
    isNoteBodyEmpty([
      { type: 'paragraph', props: {}, content: [], children: [] },
      { type: 'paragraph', props: {}, content: [], children: [] },
    ]),
    true
  );
});

test('空正文判定不接受其它块类型、多个用户空段或子块', () => {
  const nonEmptyBodies = [
    [],
    [{ type: 'text', props: {}, content: [], children: [] }],
    [
      {
        type: 'codeBlock',
        props: { language: 'text' },
        content: [{ type: 'text', text: '  ', styles: {} }],
        children: [],
      },
    ],
    [{ type: 'math', props: { expression: '  ' }, children: [] }],
    [{ type: 'mermaid', props: {}, content: [], children: [] }],
    [
      { type: 'paragraph', props: {}, content: [], children: [] },
      { type: 'paragraph', props: {}, content: [], children: [] },
      { type: 'paragraph', props: {}, content: [], children: [] },
    ],
    [
      {
        type: 'paragraph',
        props: {},
        content: [],
        children: [{ type: 'paragraph', props: {}, content: [], children: [] }],
      },
    ],
    [
      {
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: '正文', styles: {} }],
        children: [],
      },
      { type: 'paragraph', props: {}, content: [], children: [] },
    ],
  ];
  nonEmptyBodies.forEach((blocks, index) => {
    assert.equal(isNoteBodyEmpty(blocks), false, `case ${index}`);
  });
});

test('正文 paragraph 块存在任意实质内容时不判定为空', () => {
  const substantiveBlocks = [
    {
      type: 'text',
      props: {},
      content: [{ type: 'text', text: '正文', styles: {} }],
      children: [],
    },
    {
      type: 'paragraph',
      props: {},
      content: [{ type: 'text', text: '正文', styles: {} }],
      children: [],
    },
    {
      type: 'image',
      props: { url: 'https://example.com/image.png', caption: '' },
      children: [],
    },
    {
      type: 'file',
      props: { url: 'https://example.com/attachment.pdf', name: '附件.pdf' },
      children: [],
    },
    { type: 'table', props: {}, content: { type: 'tableContent', rows: [] }, children: [] },
    { type: 'math', props: { expression: 'x^2' }, children: [] },
    {
      type: 'mermaid',
      props: {},
      content: [{ type: 'text', text: 'flowchart TD\nA --> B', styles: {} }],
      children: [],
    },
    {
      type: 'paragraph',
      props: {},
      content: [{ type: 'inlineMath', props: { expression: 'a+b' } }],
      children: [],
    },
    { type: 'futureBlock', props: {}, content: [], children: [] },
    {
      type: 'bulletListItem',
      props: {},
      content: [],
      children: [
        {
          type: 'paragraph',
          props: {},
          content: [{ type: 'text', text: '嵌套内容', styles: {} }],
          children: [],
        },
      ],
    },
  ];
  substantiveBlocks.forEach((block) => {
    assert.equal(isNoteBodyEmpty([block]), false, block.type);
  });
});
