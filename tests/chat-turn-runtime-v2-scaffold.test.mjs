/**
 * runtimeV2 脚手架测试：connect FSM 与 lifecycle 枚举。
 * 阶段 1 稳定后按计划删除。
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { build } from 'esbuild';

async function loadEntry(entryPoint) {
  const bundled = await build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'node',
    format: 'esm',
    tsconfig: 'tsconfig.app.json',
    write: false,
    packages: 'external',
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].contents).toString('base64')}`
  );
}

const connectMod = await loadEntry('src/domains/ChatTurn/runtimeV2/connect/connectFsm.ts');
const lifecycleMod = await loadEntry('src/domains/ChatTurn/runtimeV2/lifecycle.ts');

const { CONNECT_PHASE, createConnectFsm, resolveContinuation } = connectMod;
const { LIFECYCLE_PHASE, isLifecycleAllowed } = lifecycleMod;

test('session 生命周期相位枚举完整', () => {
  assert.deepEqual(Object.values(LIFECYCLE_PHASE), [
    'created',
    'bootstrapping',
    'ready',
    'disposing',
    'disposed',
  ]);
});

test('isLifecycleAllowed 判定动作是否合法', () => {
  assert.equal(isLifecycleAllowed(LIFECYCLE_PHASE.created, [LIFECYCLE_PHASE.ready]), false);
  assert.equal(isLifecycleAllowed(LIFECYCLE_PHASE.ready, [LIFECYCLE_PHASE.ready]), true);
});

test('connect FSM：live 判定与 continuation 选路', () => {
  const connect = createConnectFsm();
  assert.equal(connect.getPhase(), CONNECT_PHASE.idle);
  assert.equal(connect.isLive(), false);
  assert.equal(resolveContinuation({ phase: CONNECT_PHASE.idle, activeTurnId: null }), 'recover');
  assert.equal(
    resolveContinuation({ phase: CONNECT_PHASE.idle, activeTurnId: 't1' }),
    'respond_resume'
  );

  connect.beginConnect();
  assert.equal(connect.isLive(), true);
  assert.equal(connect.resolveContinuation(null), 'respond');

  connect.markOpen();
  assert.equal(connect.getPhase(), CONNECT_PHASE.open);
  assert.equal(connect.markIdleIfOpen(), true);
  assert.equal(connect.getPhase(), CONNECT_PHASE.idle);
  assert.equal(connect.markIdleIfOpen(), false);

  connect.markClosed();
  connect.reset();
  assert.equal(connect.getPhase(), CONNECT_PHASE.idle);
});
