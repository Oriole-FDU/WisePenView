import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'contract-call-'));

const virtualModules = {
  '@/apis/request': `
    const calls = [];

    export const apiGet = async (endpoint, config) => {
      calls.push({ method: 'GET', endpoint, config });
      return null;
    };
    export const apiPost = async (endpoint, request, config) => {
      calls.push({ method: 'POST', endpoint, request, config });
      return null;
    };
    export const apiPut = async (endpoint, request, config) => {
      calls.push({ method: 'PUT', endpoint, request, config });
      return null;
    };
    export const apiPatch = async (endpoint, request, config) => {
      calls.push({ method: 'PATCH', endpoint, request, config });
      return null;
    };
    export const apiDelete = async (endpoint, config) => {
      calls.push({ method: 'DELETE', endpoint, config });
      return null;
    };

    export const getCalls = () => calls;
  `,
};

try {
  const outfile = join(tempDir, 'contract-call.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        import { z } from 'zod';

        import { defineApiContract } from '@/apis/contract';
        import { executeApiContract } from '@/apis/executeApiContract';
        import { EmptyApiResponseSchema } from '@/apis/schema';
        import { getCalls } from '@/apis/request';

        const queryRequestSchema = z.strictObject({ id: z.string().min(1) });
        const bodyRequestSchema = z.strictObject({ name: z.string().min(1) });

        const getContract = defineApiContract({
          name: 'GetContract',
          method: 'GET',
          endpoint: '/example',
          requestPlacement: 'query',
          transport: 'json',
          request: queryRequestSchema,
          response: EmptyApiResponseSchema,
        });
        const postContract = defineApiContract({
          name: 'PostContract',
          method: 'POST',
          endpoint: '/example',
          requestPlacement: 'body',
          transport: 'json',
          request: bodyRequestSchema,
          response: EmptyApiResponseSchema,
        });
        const putContract = defineApiContract({
          name: 'PutContract',
          method: 'PUT',
          endpoint: '/example/1',
          requestPlacement: 'body',
          transport: 'json',
          request: bodyRequestSchema,
          response: EmptyApiResponseSchema,
        });
        const patchContract = defineApiContract({
          name: 'PatchContract',
          method: 'PATCH',
          endpoint: '/example/1',
          requestPlacement: 'body',
          transport: 'json',
          request: bodyRequestSchema,
          response: EmptyApiResponseSchema,
        });
        const deleteContract = defineApiContract({
          name: 'DeleteContract',
          method: 'DELETE',
          endpoint: '/example/1',
          requestPlacement: 'query',
          transport: 'json',
          request: queryRequestSchema,
          response: EmptyApiResponseSchema,
        });

        export const run = async () => {
          await executeApiContract(getContract, { id: '1' }, { timeout: 1_000 });
          await executeApiContract(postContract, { name: 'demo' });
          await executeApiContract(putContract, { name: 'demo' });
          await executeApiContract(patchContract, { name: 'demo' });
          await executeApiContract(deleteContract, { id: '1' });
          return getCalls();
        };
      `,
      resolveDir: root,
      loader: 'ts',
    },
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    packages: 'external',
    alias: { '@': join(root, 'src') },
    plugins: [
      {
        name: 'contract-call-test-modules',
        setup(buildContext) {
          buildContext.onResolve({ filter: /.*/ }, ({ path }) => {
            if (!Object.hasOwn(virtualModules, path)) return;
            return { path, namespace: 'contract-call-test' };
          });
          buildContext.onLoad({ filter: /.*/, namespace: 'contract-call-test' }, ({ path }) => ({
            contents: virtualModules[path],
            loader: 'js',
          }));
        },
      },
    ],
  });

  const { run } = await import(pathToFileURL(outfile).href);
  const calls = await run();

  assert.deepEqual(calls, [
    { method: 'GET', endpoint: '/example', config: { timeout: 1_000, params: { id: '1' } } },
    { method: 'POST', endpoint: '/example', request: { name: 'demo' }, config: undefined },
    { method: 'PUT', endpoint: '/example/1', request: { name: 'demo' }, config: undefined },
    { method: 'PATCH', endpoint: '/example/1', request: { name: 'demo' }, config: undefined },
    { method: 'DELETE', endpoint: '/example/1', config: { params: { id: '1' } } },
  ]);

  console.log('Contract 统一调用与请求位置检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
