import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { buildRestrictedImportsRule } from './eslint-rules/import-policy.js';
import { wisePenPlugin } from './eslint-rules/project-rules.js';
import {
  clientRuntimeRestrictedSyntaxRules,
  domainRestrictedSyntaxRules,
  projectRestrictedProperties,
  projectRestrictedSyntaxRules,
} from './eslint-rules/restricted-syntax.js';

export default defineConfig([
  globalIgnores([
    'dist',
    '.wisepen-debug',
    'storybook-static',
    '.electron',
    'release',
    'src/components/_shadcn/**',
  ]),
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    extends: [js.configs.recommended],
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
      reportUnusedInlineConfigs: 'error',
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          reportUsedIgnorePattern: true,
        },
      ],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx,js}', '.storybook/preview.tsx'],
    plugins: { wisepen: wisePenPlugin },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'wisepen/no-arbitrary-throw': 'warn',
      'wisepen/no-direct-error-toast': 'error',
      'wisepen/no-direct-wise-pen-error': 'error',
      'wisepen/no-legacy-error-report-api': 'error',
    },
  },
  {
    files: [
      '*.{js,mjs,cjs,ts}',
      'scripts/**/*.{js,mjs,cjs}',
      'tests/**/*.{js,mjs,cjs}',
      'electron/**/*.{ts,tsx}',
      '.storybook/main.ts',
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      // Vite 使用自动 JSX runtime，不再隐式引用 React 默认导入。
      parserOptions: { jsxPragma: null },
    },
    plugins: {
      wisepen: wisePenPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-alert': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-restricted-imports': buildRestrictedImportsRule(),
      'no-restricted-properties': ['error', ...projectRestrictedProperties],
      'no-restricted-syntax': ['error', ...projectRestrictedSyntaxRules],
      'wisepen/no-use-effect': 'warn',
      'wisepen/component-conventions': 'warn',
      'wisepen/domain-conventions': 'warn',
      'wisepen/no-memoized-fn': 'warn',
      'wisepen/no-memoization': 'warn',
    },
  },
  {
    // 类型感知规则只用于会改变运行行为的异步风险；warning 暴露问题，暂不阻塞 CI。
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/await-thenable': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
    },
  },
  {
    // ChatTurn 作为新契约试点；规则先在边界验证，再按告警价值决定是否扩大。
    files: ['src/domains/ChatTurn/**/*.{ts,tsx}'],
    plugins: { wisepen: wisePenPlugin },
    rules: {
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      'wisepen/no-type-comments': 'warn',
      'wisepen/require-hook-file-header': 'warn',
    },
  },
  {
    files: [
      'src/components/editors/skill/**/*.{ts,tsx,js,jsx}',
      'src/domains/{Resource,Tag,Image,Document,Auth,User,Group,Wallet}/**/*.{ts,tsx,js,jsx}',
    ],
    ignores: [
      '**/{fixtures,__fixtures__,snapshots,__snapshots__,generated,__generated__}/**',
      '**/*.{fixture,snapshot,generated}.{ts,tsx,js,jsx}',
    ],
    plugins: { wisepen: wisePenPlugin },
    rules: {
      'max-lines': ['warn', { max: 400 }],
      'wisepen/max-lines-error': 'error',
    },
  },
  {
    // 前端路由只能由 route contract 暴露；管理端公告跳转自由文本本轮明确不纳入治理。
    files: [
      'src/components/**/*.{ts,tsx}',
      'src/hooks/**/*.{ts,tsx}',
      'src/layouts/**/*.{ts,tsx}',
      'src/views/**/*.{ts,tsx}',
    ],
    ignores: ['src/views/admin/AnnouncementManagement/**/*.{ts,tsx}'],
    rules: {
      'wisepen/no-hardcoded-frontend-route': 'error',
    },
  },
  {
    // 新右栏布局必须保持为纯布局，由调用方通过槽位注入业务内容。
    files: ['src/layouts/WorkspaceRightPanelLayout/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({
        forbidLayoutBusinessImports: true,
      }),
    },
  },
  {
    // 客户端运行时代码统一创建 WisePenError，构建配置不属于该边界。
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...clientRuntimeRestrictedSyntaxRules],
    },
  },
  {
    // Domain 业务代码新建错误必须走 createDomainError；传输边界与 mock 模拟 API 错误除外。
    files: ['src/domains/**/*.{ts,tsx}'],
    ignores: [
      'src/domains/_shared/apis/**/*.{ts,tsx}',
      'src/domains/_shared/mock/**/*.{ts,tsx}',
      'src/domains/*/mock/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-syntax': ['error', ...domainRestrictedSyntaxRules],
    },
  },
  {
    // Feedback 封装内部允许直连 HeroUI Spinner，其它业务代码统一使用 Spin/LoadingState。
    files: ['src/components/base/Feedback/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({ allowFeedbackPrimitive: true }),
    },
  },
  {
    // Button 封装内部允许直连 HeroUI Button，其它业务代码统一使用 AppButton。
    files: ['src/components/base/Button/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({ allowButtonPrimitive: true }),
    },
  },
  {
    // Input 封装内部允许直连 HeroUI 输入原语，其它业务代码统一使用项目输入封装。
    files: ['src/components/base/Input/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({ allowInputPrimitive: true }),
    },
  },
  {
    // ChatInput 与富文本工具栏依赖底层 textarea/input 的特殊组合行为，单独留白名单。
    files: [
      'src/components/business/Chat/ChatConversation/ChatInput/index.tsx',
      'src/components/editors/note/CustomBlockNote/ui/toolbar/components/FileButtons.tsx',
      'src/components/editors/note/CustomBlockNote/ui/toolbar/components/LinkButton.tsx',
      'src/components/business/Resource/FavoriteCollectionPicker/CollectionPickerModal.tsx',
      'src/components/business/UserSearchCombobox/index.tsx',
      'src/views/app/course/CourseEditorPage/_components/CourseEditorDateFields/index.tsx',
      'src/components/editors/agent/components/AgentEditor/sections/MemorySection/index.tsx',
    ],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({ allowInputPrimitive: true }),
    },
  },
  {
    // 浮层封装内部允许直连 HeroUI / 项目底层浮层原语：base 提供 Modal、Popover 原子层与 App 级外壳，
    // business 的语义弹窗统一组合 base/Modal。
    files: [
      'src/components/base/Modal/**/*.{ts,tsx}',
      'src/components/base/Popover/**/*.{ts,tsx}',
      'src/components/base/AppModal/**/*.{ts,tsx}',
      'src/components/base/AppPopover/**/*.{ts,tsx}',
      'src/components/business/AppAlertDialog/**/*.{ts,tsx}',
      'src/components/business/AppDisplayDialog/**/*.{ts,tsx}',
      'src/components/business/AppFormDialog/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({ allowOverlayPrimitive: true }),
    },
  },
  {
    // 构建时分别选择真实 API 与 mock API，service 装配不分叉。
    files: ['src/domains/_registry/apis.impl.ts'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({ allowDomainApiFunction: true }),
    },
  },
  {
    files: ['src/domains/_registry/apis.mock.ts', 'src/domains/*/mock/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({ allowDomainMock: true }),
    },
  },
  {
    // Domain API 层负责把 Contract 绑定到领域方法，不直接操作底层客户端。
    files: ['src/domains/*/apis/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({
        allowApiRequest: true,
      }),
    },
  },
  {
    // Contract 统一调用器负责 transport 分发，业务 API 只绑定 Contract 与参数。
    files: ['src/apis/executeApiContract.ts'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({
        allowApiRequest: true,
      }),
    },
  },
  {
    // 业务与 OSS 会话管理统一经构建出口选择 I/O。
    files: ['src/domains/*/service/**/*.{ts,tsx}', 'src/domains/_shared/ossStsClient.ts'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({
        allowDomainApiPort: true,
      }),
    },
  },
  {
    // Service 工厂的唯一合法装配入口：只有 registry.ts 可以 import createXxxServices。
    // 请勿扩大此白名单，否则"分层 + 显式注入"约束将被破坏。
    files: ['src/domains/_registry/registry.ts'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({ allowServiceFactory: true }),
    },
  },
  {
    // API 运行时是唯一允许直连 Axios 的入口。
    files: ['src/apis/request.ts'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({ allowDirectAxios: true }),
    },
  },
]);
