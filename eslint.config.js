import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const ahooksUpdateEffectImportRule = {
  name: 'ahooks',
  importNames: ['useUpdateEffect'],
  message:
    'useUpdateEffect 只是跳过首次执行，不能替代副作用设计；请改为事件驱动、渲染期派生、useApi 或有带 @wisepen-manual-effect 标记完整说明的 useEffect。',
};

const reactFcImportRule = {
  name: 'react',
  importNames: ['FC'],
  message: '项目约定组件使用普通函数声明，请不要使用 React.FC / FC。',
};

const heroUiOverlayPrimitiveImportRule = {
  name: '@heroui/react',
  importNames: ['Modal', 'AlertDialog'],
  message:
    '业务浮层请使用 src/components/business 下的 AppAlertDialog、AppFormDialog、AppDisplayDialog 或 src/components/base/AppModal；底层 Modal / AlertDialog 只允许浮层封装内部使用。',
};

const heroUiButtonPrimitiveImportRule = {
  name: '@heroui/react',
  importNames: ['Button'],
  message:
    '业务按钮请使用 src/components/base/Button 下的 AppButton；底层 Button 只允许 Button 封装内部使用。',
};

const heroUiInputPrimitiveImportRule = {
  name: '@heroui/react',
  importNames: ['Input', 'TextArea', 'TextField', 'Select'],
  message:
    '业务输入控件请使用 src/components/base/Input 下的 FormField、Input、TextArea 或 Select；底层输入控件只允许 Input 封装内部或明确特殊组件使用。',
};

const heroUiFeedbackPrimitiveImportRule = {
  name: '@heroui/react',
  importNames: ['Spinner'],
  message:
    '业务加载反馈请使用 src/components/base/Feedback 下的 Spin 或 LoadingState；底层 Spinner 只允许 Feedback 封装内部使用。',
};

const projectOverlayModalImportRule = {
  name: '@/components/base/Modal',
  importNames: ['Modal'],
  message:
    '业务浮层请使用 AppAlertDialog、AppFormDialog、AppDisplayDialog 或 AppModal；直接使用底层 Modal 需要在 eslint 白名单中记录特殊原因。',
};

const projectOverlayModalImportPattern = {
  group: [
    '@/components/base/Modal',
    '@/components/base/Modal.*',
    '**/components/base/Modal',
    '**/components/base/Modal.*',
  ],
  message:
    '业务浮层请使用 AppAlertDialog、AppFormDialog、AppDisplayDialog 或 AppModal；不要直接导入底层 Modal。',
};

const directAxiosImportRule = {
  name: '@/apis/Axios',
  message:
    '禁止直接 import Axios，请通过 `@/apis/request` 调用；仅 `src/apis/request.ts` 允许直接使用。',
};

const directAxiosImportPattern = {
  group: ['**/apis/Axios'],
  message:
    '禁止直接 import Axios，请通过 `@/apis/request` 调用；仅 `src/apis/request.ts` 允许直接使用。',
};

const serviceFactoryImportPattern = {
  group: [
    '@/domains/*/service/*Services.impl',
    '@/domains/*/service/*Services.impl.*',
    // 相对路径同样拦截，防止绕过 `@/` 别名
    '**/service/*Services.impl',
    '**/service/*Services.impl.*',
    '**/domains/*/service/*Services.impl',
    '**/domains/*/service/*Services.impl.*',
  ],
  importNamePattern: '^create[A-Z]\\w*Services$',
  message:
    '项目保留命名约定：createXxxServices 是 Service 工厂的专属符号，仅允许在装配入口 src/domains/_registry/registry.impl.ts 中 import；其它位置禁止直接导入或调用，业务代码请通过 useXxxService() 获取实例。',
};

const serviceMockImportPattern = {
  group: [
    '@/domains/*/mock/*Services.mock',
    '@/domains/*/mock/*Services.mock.*',
    '**/domains/*/mock/*Services.mock',
    '**/domains/*/mock/*Services.mock.*',
  ],
  message:
    'Mock Service 只能在 src/domains/_registry/registry.mock.ts 装配；业务代码请通过 useXxxService() 获取实例。',
};

const apiRequestImportPattern = {
  group: ['@/apis/request', '**/apis/request'],
  message:
    'apiGet/apiPost/apiPut/apiDelete 只能在 src/domains/<Domain>/apis 中使用；其它层请通过 useXxxService() 或 service 编排调用。',
};

const domainApiFunctionImportPattern = {
  group: ['@/domains/*/apis/*Api', '**/domains/*/apis/*Api', '**/apis/*Api'],
  message:
    '领域 API 函数只能由 src/domains/<Domain>/service 调用；mapper、组件和页面只允许依赖领域类型或 API type。',
};

const buildRestrictedImportsRule = ({
  allowApiRequest = false,
  allowButtonPrimitive = false,
  allowDirectAxios = false,
  allowDomainApiFunction = false,
  allowInputPrimitive = false,
  allowFeedbackPrimitive = false,
  allowOverlayPrimitive = false,
  allowServiceFactory = false,
  allowServiceMock = false,
} = {}) => {
  const paths = [
    ahooksUpdateEffectImportRule,
    reactFcImportRule,
    ...(allowButtonPrimitive ? [] : [heroUiButtonPrimitiveImportRule]),
    ...(allowInputPrimitive ? [] : [heroUiInputPrimitiveImportRule]),
    ...(allowFeedbackPrimitive ? [] : [heroUiFeedbackPrimitiveImportRule]),
    ...(allowOverlayPrimitive
      ? []
      : [heroUiOverlayPrimitiveImportRule, projectOverlayModalImportRule]),
    ...(allowDirectAxios ? [] : [directAxiosImportRule]),
  ];
  const patterns = [
    ...(allowOverlayPrimitive ? [] : [projectOverlayModalImportPattern]),
    ...(allowDirectAxios ? [] : [directAxiosImportPattern]),
    ...(allowServiceFactory ? [] : [serviceFactoryImportPattern]),
    ...(allowServiceMock ? [] : [serviceMockImportPattern]),
    ...(allowApiRequest ? [] : [apiRequestImportPattern]),
    ...(allowDomainApiFunction ? [] : [domainApiFunctionImportPattern]),
  ];

  return ['error', { paths, patterns }];
};

const requireManualEffectJSDocRule = {
  meta: {
    type: 'problem',
    docs: {
      description: '要求 useEffect 说明执行时机、不可替代原因和 cleanup',
    },
    schema: [],
    messages: {
      missing:
        'useEffect 上方必须紧邻中文 JSDoc，并包含 @wisepen-manual-effect、“执行时机：”“不可替代原因：”“cleanup：”。',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'useEffect') return;
        const statement = node.parent?.type === 'ExpressionStatement' ? node.parent : node;
        const comment = sourceCode.getCommentsBefore(statement).at(-1);
        const isAdjacent =
          comment?.loc?.end.line != null &&
          statement.loc?.start.line != null &&
          statement.loc.start.line - comment.loc.end.line <= 1;
        const commentText = comment?.value ?? '';
        const isValid =
          comment?.type === 'Block' &&
          commentText.startsWith('*') &&
          isAdjacent &&
          ['@wisepen-manual-effect', '执行时机：', '不可替代原因：', 'cleanup：'].every((field) =>
            commentText.includes(field)
          );
        if (!isValid) {
          context.report({ node, messageId: 'missing' });
        }
      },
    };
  },
};

const requireManualMemoJSDocRule = {
  meta: {
    type: 'problem',
    docs: {
      description: '要求 useMemo/useCallback 说明必要性、收益和失效条件',
    },
    schema: [],
    messages: {
      missing:
        'useMemo/useCallback 上方必须紧邻中文 JSDoc，并包含 @wisepen-manual-memo、“为什么：”“收益：”“失效条件：”。',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const statementTypes = new Set([
      'ExpressionStatement',
      'VariableDeclaration',
      'ReturnStatement',
      'AssignmentExpression',
    ]);

    const getStatement = (node) => {
      let current = node;
      while (current.parent && !statementTypes.has(current.parent.type)) {
        current = current.parent;
      }
      return current.parent ?? node;
    };

    return {
      CallExpression(node) {
        if (
          node.callee.type !== 'Identifier' ||
          !['useMemo', 'useCallback'].includes(node.callee.name)
        ) {
          return;
        }

        const statement = getStatement(node);
        const comment = sourceCode.getCommentsBefore(statement).at(-1);
        const isAdjacent =
          comment?.loc?.end.line != null &&
          statement.loc?.start.line != null &&
          statement.loc.start.line - comment.loc.end.line <= 1;
        const commentText = comment?.value ?? '';
        const isValid =
          comment?.type === 'Block' &&
          commentText.startsWith('*') &&
          isAdjacent &&
          ['@wisepen-manual-memo', '为什么：', '收益：', '失效条件：'].every((field) =>
            commentText.includes(field)
          );

        if (!isValid) {
          context.report({ node, messageId: 'missing' });
        }
      },
    };
  },
};

const noHardcodedFrontendRouteRule = {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止 UI、布局和 Hook 直接硬编码前端路由',
    },
    schema: [],
    messages: {
      hardcoded: '禁止直接硬编码前端路径；请使用 APP_ROUTE_PATH 或领域 route builder。',
    },
  },
  create(context) {
    const isFrontendRoute = (value) =>
      typeof value === 'string' &&
      /^\/(?:chat|notifications|drive|resources|groups|courses|invite|profile|login|register|onboarding|password|email|auth|admin)(?:\/|$)/.test(
        value
      );
    const reportIfRoute = (node, value) => {
      if (isFrontendRoute(value)) context.report({ node, messageId: 'hardcoded' });
    };

    return {
      Literal(node) {
        reportIfRoute(node, node.value);
      },
      TemplateElement(node) {
        reportIfRoute(node, node.value.raw);
      },
    };
  },
};

const wisePenPlugin = {
  rules: {
    'no-hardcoded-frontend-route': noHardcodedFrontendRouteRule,
    'require-manual-effect-jsdoc': requireManualEffectJSDocRule,
    'require-manual-memo-jsdoc': requireManualMemoJSDocRule,
  },
};

const projectRestrictedSyntaxRules = [
  {
    selector:
      "TSTypeReference[typeName.type='TSQualifiedName'][typeName.left.name='React'][typeName.right.name='FC']",
    message: '项目约定组件使用普通函数声明，请不要使用 React.FC / FC。',
  },
  {
    selector: 'ExportAllDeclaration[source.value=/Services\\.impl(\\.[jt]sx?)?$/]',
    message:
      '禁止 re-export *Services.impl —— createXxxServices 工厂只能在 src/domains/_registry/registry.impl.ts 装配，index.ts 不得二次导出。',
  },
  {
    selector: 'ExportNamedDeclaration[source.value=/Services\\.impl(\\.[jt]sx?)?$/]',
    message:
      '禁止 re-export *Services.impl —— createXxxServices 工厂只能在 src/domains/_registry/registry.impl.ts 装配，index.ts 不得二次导出。',
  },
];

const nativeErrorRestrictedSyntaxRules = [
  {
    selector: "NewExpression[callee.name='Error']",
    message:
      '禁止直接创建原生 Error；客户端错误使用 createClientError，网络、HTTP、API 边界使用 WisePenError。',
  },
  {
    selector: "CallExpression[callee.name='Error']",
    message:
      '禁止直接创建原生 Error；客户端错误使用 createClientError，网络、HTTP、API 边界使用 WisePenError。',
  },
];

export default defineConfig([
  globalIgnores(['dist', 'storybook-static', '.electron', 'release', 'src/components/_shadcn/**']),
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
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: [
      '*.{js,mjs,cjs,ts}',
      'scripts/**/*.{js,mjs,cjs}',
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
      'no-restricted-properties': [
        'error',
        {
          object: 'React',
          property: 'useEffect',
          message:
            '请命名导入 useEffect，并在调用点写带 @wisepen-manual-effect 标记的完整中文 JSDoc。',
        },
        {
          object: 'React',
          property: 'useCallback',
          message: '请命名导入 useCallback，并在调用点写带 @wisepen-manual-memo 标记的中文 JSDoc。',
        },
        {
          object: 'React',
          property: 'useMemo',
          message: '请命名导入 useMemo，并在调用点写带 @wisepen-manual-memo 标记的中文 JSDoc。',
        },
        {
          object: 'ahooks',
          property: 'useUpdateEffect',
          message:
            '项目禁止 ahooks.useUpdateEffect；请改为事件驱动、渲染期派生、useApi 或有带 @wisepen-manual-effect 标记完整说明的 useEffect。',
        },
      ],
      'no-restricted-syntax': ['error', ...projectRestrictedSyntaxRules],
      'wisepen/require-manual-effect-jsdoc': 'error',
      'wisepen/require-manual-memo-jsdoc': 'error',
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
    // 客户端运行时代码统一创建 WisePenError，构建配置不属于该边界。
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...projectRestrictedSyntaxRules,
        ...nativeErrorRestrictedSyntaxRules,
      ],
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
      'src/components/business/ChatPanel/ChatInput/index.tsx',
      'src/components/business/Note/CustomBlockNote/ui/toolbar/components/FileButtons.tsx',
      'src/components/business/Note/CustomBlockNote/ui/toolbar/components/LinkButton.tsx',
      'src/components/business/Resource/FavoriteCollectionPicker/CollectionPickerModal.tsx',
      'src/components/business/UserSearchCombobox/index.tsx',
      'src/views/app/course/CourseEditorPage/_components/CourseEditorDateFields/index.tsx',
      'src/views/resource/agent/_components/AgentEditor/sections/MemorySection/index.tsx',
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
    // Mock Service 的唯一合法装配入口。
    files: ['src/domains/_registry/registry.mock.ts'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({ allowServiceMock: true }),
    },
  },
  {
    // Domain API 层是唯一允许调用 apiGet/apiPost/apiPut/apiDelete 的业务层。
    files: ['src/domains/*/apis/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({
        allowApiRequest: true,
      }),
    },
  },
  {
    // Service 层是唯一允许调用领域 API 函数的业务层。
    files: ['src/domains/*/service/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({
        allowDomainApiFunction: true,
      }),
    },
  },
  {
    // Service 工厂的唯一合法装配入口：只有 registry.impl.ts 可以 import createXxxServices。
    // 请勿扩大此白名单，否则"分层 + 显式注入"约束将被破坏。
    files: ['src/domains/_registry/registry.impl.ts'],
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
  {
    // Mock 实现允许 console.log 作为调试路径
    files: ['src/domains/*/mock/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },
]);
