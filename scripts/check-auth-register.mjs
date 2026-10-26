import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'check-auth-register-'));

const virtualModules = {
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

try {
  const outfile = join(tempDir, 'auth-register.mjs');
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
        setup(build) {
          build.onResolve({ filter: /.*/ }, ({ path }) => {
            if (!Object.hasOwn(virtualModules, path)) return;
            return { path, namespace: 'auth-register-test' };
          });
          build.onLoad({ filter: /.*/, namespace: 'auth-register-test' }, ({ path }) => ({
            contents: virtualModules[path],
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
  await rm(tempDir, { recursive: true, force: true });
}
