import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => ({
    ...config,
    plugins: [...(config.plugins ?? []), tailwindcss()],
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
