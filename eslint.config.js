import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              importNames: ['useEffect'],
              message: '项目约定禁止使用 useEffect，请改为事件驱动、显式回调或更合适的数据流方案。',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'React',
          property: 'useEffect',
          message: '项目约定禁止使用 useEffect，请改为事件驱动、显式回调或更合适的数据流方案。',
        },
      ],
    },
  },
  {
    // 全局禁止 useEffect，只有统一封装入口允许直接调用原生 useEffect。
    // 请勿删除此白名单，否则 useEffectForce 无法工作。
    files: ['src/hooks/useEffectForce.ts'],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-properties': 'off',
    },
  },
]);
