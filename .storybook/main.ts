import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';

const currentDir = dirname(fileURLToPath(import.meta.url));
const isAppPrivateSourceMapPlugin = (plugin: unknown): boolean =>
  typeof plugin === 'object' &&
  plugin !== null &&
  'name' in plugin &&
  plugin.name === 'wisepen-private-source-maps';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => ({
    ...config,
    // 私有 Source Map 只服务应用发布产物，Storybook 预览不生成对应附件。
    plugins: [
      ...(config.plugins ?? []).filter((plugin) => !isAppPrivateSourceMapPlugin(plugin)),
      tailwindcss(),
    ],
    resolve: {
      ...config.resolve,
      alias: {
        ...(config.resolve?.alias ?? {}),
        '@': resolve(currentDir, '../src'),
        '@domain-apis': resolve(currentDir, '../src/domains/_registry/apis.mock.ts'),
      },
    },
  }),
};

export default config;
