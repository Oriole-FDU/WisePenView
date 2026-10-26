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
          EmptyAuthApiResponseSchema,
          LoginApiRequestSchema,
          LoginApiResponseSchema,
          RegisterApiRequestSchema,
        } from '@/domains/Auth/apis/AuthApi.schema';
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
    EmptyAuthApiResponseSchema,
    isApiResponseEnvelope,
    LoginApiRequestSchema,
    LoginApiResponseSchema,
    parseApiRequest,
    parseApiResponse,
    RegisterApiRequestSchema,
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

  const loginRequestContext = {
    contract: 'LoginApiRequest',
    endpoint: '/auth/login',
  };
  const loginResponseContext = {
    contract: 'LoginApiResponse',
    endpoint: '/auth/login',
  };
  const registerRequestContext = {
    contract: 'RegisterApiRequest',
    endpoint: '/auth/register',
  };
  const emptyResponseContext = {
    contract: 'EmptyAuthApiResponse',
    endpoint: '/auth/logout',
  };

  assert.deepEqual(
    parseApiRequest(
      LoginApiRequestSchema,
      { account: 'alice', password: 'secret', ignored: true },
      loginRequestContext
    ),
    { account: 'alice', password: 'secret' }
  );
  assert.equal(
    parseApiResponse(LoginApiResponseSchema, 'session-id', loginResponseContext),
    'session-id'
  );

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

  expectContractError(
    () => parseApiRequest(LoginApiRequestSchema, { password: 'secret' }, loginRequestContext),
    {
      code: 100,
      source: 'client',
      direction: 'request',
      endpoint: '/auth/login',
      contract: 'LoginApiRequest',
      path: 'account',
      issueCode: 'invalid_type',
    }
  );
  expectContractError(() => parseApiResponse(LoginApiResponseSchema, '', loginResponseContext), {
    code: 16,
    source: 'http',
    direction: 'response',
    endpoint: '/auth/login',
    contract: 'LoginApiResponse',
    path: '$',
    issueCode: 'too_small',
  });
  expectContractError(() => parseApiResponse(LoginApiResponseSchema, 123, loginResponseContext), {
    code: 16,
    source: 'http',
    direction: 'response',
    endpoint: '/auth/login',
    contract: 'LoginApiResponse',
    path: '$',
    issueCode: 'invalid_type',
  });

  assert.deepEqual(
    parseApiRequest(
      RegisterApiRequestSchema,
      { username: 'alice', password: 'secret' },
      registerRequestContext
    ),
    { username: 'alice', password: 'secret' }
  );
  expectContractError(
    () =>
      parseApiRequest(
        RegisterApiRequestSchema,
        { username: 'alice', password: 'secret', inviteCode: null },
        registerRequestContext
      ),
    {
      code: 100,
      source: 'client',
      direction: 'request',
      endpoint: '/auth/register',
      contract: 'RegisterApiRequest',
      path: 'inviteCode',
      issueCode: 'invalid_type',
    }
  );

  assert.equal(parseApiResponse(EmptyAuthApiResponseSchema, null, emptyResponseContext), null);
  for (const invalidResponse of [undefined, '', {}, 0]) {
    expectContractError(
      () => parseApiResponse(EmptyAuthApiResponseSchema, invalidResponse, emptyResponseContext),
      {
        code: 16,
        source: 'http',
        direction: 'response',
        endpoint: '/auth/logout',
        contract: 'EmptyAuthApiResponse',
        path: '$',
        issueCode: 'invalid_type',
      }
    );
  }

  console.log('API response envelope 契约离线检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
