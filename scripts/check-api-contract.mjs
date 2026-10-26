import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'check-api-contract-'));

try {
  const outfile = join(tempDir, 'runtime-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiRequest, parseApiResponse } from '@/apis/contract';
        export { isApiResponseEnvelope } from '@/apis/runtimeContract';
        export {
          LoginApiContract,
          LogoutApiContract,
          RegisterApiContract,
        } from '@/domains/Auth/apis/AuthApi.contract';
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
    isApiResponseEnvelope,
    LoginApiContract,
    LogoutApiContract,
    parseApiRequest,
    parseApiResponse,
    RegisterApiContract,
  } = await import(pathToFileURL(outfile).href);
  assert(isApiResponseEnvelope({ code: 200, key: null, msg: null, data: null }));
  assert(isApiResponseEnvelope({ code: 200, msg: 'ok', data: { id: 'resource' } }));
  assert(!isApiResponseEnvelope({ code: Number.NaN, msg: 'ok', data: null }));
  assert(!isApiResponseEnvelope({ code: Number.POSITIVE_INFINITY, msg: 'ok', data: null }));
  assert(!isApiResponseEnvelope({ code: '200', msg: 'ok', data: null }));
  assert(!isApiResponseEnvelope({ code: 200, msg: 0, data: null }));
  assert(!isApiResponseEnvelope({ code: 200, key: 1, msg: null, data: null }));
  assert(!isApiResponseEnvelope({ code: 200, msg: null, data: null }));
  assert(!isApiResponseEnvelope({ code: 200, key: 'java', msg: 0, data: null }));
  assert(!isApiResponseEnvelope([]));

  assert.equal(LoginApiContract.name, 'LoginApi');
  assert.equal(LoginApiContract.endpoint, '/auth/login');
  assert.deepEqual(
    parseApiRequest(LoginApiContract, { account: 'alice', password: 'secret', ignored: true }),
    { account: 'alice', password: 'secret' }
  );
  assert.equal(parseApiResponse(LoginApiContract, 'session-id'), 'session-id');

  const expectContractError = (run, expected) => {
    let thrown;
    try {
      run();
    } catch (error) {
      thrown = error;
    }
    assert(thrown instanceof Error);
    assert.equal(thrown.code, expected.code);
    assert.equal(thrown.source, expected.source);
    assert.equal(thrown.meta.direction, expected.direction);
    assert.equal(thrown.meta.endpoint, expected.endpoint);
    assert.equal(thrown.meta.contract, expected.contract);
    assert(
      thrown.meta.issues.some(
        (issue) => issue.path === expected.path && issue.code === expected.issueCode
      )
    );
  };

  expectContractError(() => parseApiRequest(LoginApiContract, { password: 'secret' }), {
    code: 100,
    source: 'client',
    direction: 'request',
    endpoint: '/auth/login',
    contract: 'LoginApi',
    path: 'account',
    issueCode: 'invalid_type',
  });
  expectContractError(() => parseApiResponse(LoginApiContract, ''), {
    code: 16,
    source: 'http',
    direction: 'response',
    endpoint: '/auth/login',
    contract: 'LoginApi',
    path: '$',
    issueCode: 'too_small',
  });
  expectContractError(() => parseApiResponse(LoginApiContract, 123), {
    code: 16,
    source: 'http',
    direction: 'response',
    endpoint: '/auth/login',
    contract: 'LoginApi',
    path: '$',
    issueCode: 'invalid_type',
  });

  assert.deepEqual(
    parseApiRequest(RegisterApiContract, { username: 'alice', password: 'secret' }),
    { username: 'alice', password: 'secret' }
  );
  expectContractError(
    () =>
      parseApiRequest(RegisterApiContract, {
        username: 'alice',
        password: 'secret',
        inviteCode: null,
      }),
    {
      code: 100,
      source: 'client',
      direction: 'request',
      endpoint: '/auth/register',
      contract: 'RegisterApi',
      path: 'inviteCode',
      issueCode: 'invalid_type',
    }
  );

  assert.equal(parseApiResponse(LogoutApiContract, null), null);
  for (const invalidResponse of [undefined, '', {}, 0]) {
    expectContractError(() => parseApiResponse(LogoutApiContract, invalidResponse), {
      code: 16,
      source: 'http',
      direction: 'response',
      endpoint: '/auth/logout',
      contract: 'LogoutApi',
      path: '$',
      issueCode: 'invalid_type',
    });
  }

  console.log('API response envelope 契约离线检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
