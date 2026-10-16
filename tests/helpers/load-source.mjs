import { Buffer } from 'node:buffer';
import { fileURLToPath, URL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('../../', import.meta.url));

export async function loadSourceModule(contents, stubs = {}) {
  const result = await build({
    absWorkingDir: root,
    stdin: { contents, resolveDir: root },
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    tsconfig: 'tsconfig.app.json',
    plugins: [
      {
        name: 'test-boundaries',
        setup(build) {
          build.onResolve({ filter: /.*/ }, ({ path }) =>
            Object.hasOwn(stubs, path) ? { path, namespace: 'test' } : undefined
          );
          build.onLoad({ filter: /.*/, namespace: 'test' }, ({ path }) => ({
            contents: stubs[path],
            loader: 'js',
          }));
        },
      },
    ],
  });

  return import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`
  );
}
