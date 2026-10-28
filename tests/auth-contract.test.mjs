import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'auth-contract-'));

try {
  const outfile = join(tempDir, 'runtime-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiRequest, parseApiResponse } from '@/apis/contract';
        export { isApiResponseEnvelope } from '@/apis/runtimeContract';
        export {
          ChangePasswordApiContract,
          LoginApiContract,
          LogoutApiContract,
          RegisterApiContract,
          ResetPasswordApiContract,
          ResetPasswordEmailApiContract,
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
    ChangePasswordApiContract,
    isApiResponseEnvelope,
    LoginApiContract,
    LogoutApiContract,
    parseApiRequest,
    parseApiResponse,
    RegisterApiContract,
    ResetPasswordApiContract,
    ResetPasswordEmailApiContract,
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

  for (const contract of [
    LoginApiContract,
    LogoutApiContract,
    RegisterApiContract,
    ResetPasswordEmailApiContract,
    ResetPasswordApiContract,
    ChangePasswordApiContract,
  ]) {
    assert(Object.hasOwn(contract, 'request'), `${contract.name} 缺少 request`);
    assert(Object.hasOwn(contract, 'response'), `${contract.name} 缺少 response`);
  }
  assert(LogoutApiContract.request.safeParse(undefined).success);
  assert(LogoutApiContract.response.safeParse(null).success);

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

const registerVirtualModules = {
  '@/apis/request': `
    const postedRequests = [];

    export const apiPost = async (endpoint, request) => {
      postedRequests.push({ endpoint, request });
      return null;
    };

    export const getPostedRequests = () => postedRequests;
  `,
  '@/utils/auth/authSessionCoordinator': `
    export const authSessionCoordinator = {
      publish: () => undefined,
    };
  `,
};
const registerTempDir = await mkdtemp(join(cacheDir, 'auth-register-'));

try {
  const outfile = join(registerTempDir, 'auth-register.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        import type { RegisterRequest } from '@/domains/Auth/service/AuthService.type';
        import { createAuthServices } from '@/domains/Auth/service/AuthServices.impl';
        import { getPostedRequests } from '@/apis/request';

        const authService = createAuthServices();
        const registerRequest: RegisterRequest = {
          username: 'tester',
          password: 'secret',
          inviteCode: '  ab-12  ',
        };
        await authService.register(registerRequest);

        const registerRequestWithoutInviteCode: RegisterRequest = {
          username: 'another-tester',
          password: 'another-secret',
          inviteCode: '   ',
        };
        await authService.register(registerRequestWithoutInviteCode);

        export { getPostedRequests };
      `,
      resolveDir: root,
      loader: 'ts',
    },
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    packages: 'external',
    alias: {
      '@': join(root, 'src'),
      '@domain-apis': join(root, 'src/domains/Auth/apis/AuthApi.ts'),
    },
    plugins: [
      {
        name: 'auth-register-test-modules',
        setup(buildContext) {
          buildContext.onResolve({ filter: /.*/ }, ({ path }) => {
            if (!Object.hasOwn(registerVirtualModules, path)) return;
            return { path, namespace: 'auth-register-test' };
          });
          buildContext.onLoad({ filter: /.*/, namespace: 'auth-register-test' }, ({ path }) => ({
            contents: registerVirtualModules[path],
            loader: 'js',
          }));
        },
      },
    ],
  });

  const { getPostedRequests } = await import(pathToFileURL(outfile).href);
  const postedRequests = getPostedRequests();

  assert.deepEqual(postedRequests[0], {
    endpoint: '/auth/register',
    request: {
      username: 'tester',
      password: 'secret',
      inviteCode: 'AB-12',
    },
  });
  assert.deepEqual(postedRequests[1], {
    endpoint: '/auth/register',
    request: {
      username: 'another-tester',
      password: 'another-secret',
    },
  });
  assert(!Object.hasOwn(postedRequests[1].request, 'inviteCode'));
} finally {
  await rm(registerTempDir, { recursive: true, force: true });
}
