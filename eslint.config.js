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
    '项目保留命名约定：createXxxServices 是 Service 工厂的专属符号，仅允许在装配入口 src/domains/_registry/registry.ts 中 import；其它位置禁止直接导入或调用，业务代码请通过 useXxxService() 获取实例。',
};

const domainApiPortImportRule = {
  name: '@domain-apis',
  message:
    'API 实现入口只允许 service 与 OSS 会话管理器使用；组件请通过 useXxxService() 获取能力。',
};

const domainMockImportPattern = {
  group: ['@/domains/*/mock/**', '**/domains/*/mock/**'],
  message:
    'Mock API 只允许在 apis.mock.ts 装配或 mock 内部引用；业务代码通过 @domain-apis 使用统一 API 契约。',
};

const apiRequestImportPattern = {
  group: ['@/apis/request', '**/apis/request'],
  message:
    'apiGet/apiPost/apiPut/apiPatch/apiDelete 只能在 src/domains/<Domain>/apis 或 src/apis/executeApiContract.ts 中使用；其它层请通过 useXxxService() 或 service 编排调用。',
};

const domainApiFunctionImportPattern = {
  group: ['@/domains/*/apis/*Api', '**/domains/*/apis/*Api', '**/apis/*Api'],
  allowTypeImports: true,
  message:
    '真实领域 API 只允许在 apis.impl.ts 导出；service 通过 @domain-apis 调用，其他层只能引用 API 类型。',
};

const workspaceLayoutBusinessImportPattern = {
  group: [
    '@/components/business/**',
    '@/components/editors/**',
    '@/domains/**',
    '@/views/**',
    '**/components/business/**',
    '**/components/editors/**',
    '**/domains/**',
    '**/views/**',
  ],
  message:
    'Layout 只维护槽位、尺寸、显隐、滚动、断点和焦点；业务内容、领域能力与页面编排必须由 view 通过 ReactNode 槽位传入。',
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
  allowDomainApiPort = false,
  allowDomainMock = false,
  forbidLayoutBusinessImports = false,
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
    ...(allowDomainApiPort ? [] : [domainApiPortImportRule]),
  ];
  const patterns = [
    ...(allowOverlayPrimitive ? [] : [projectOverlayModalImportPattern]),
    ...(allowDirectAxios ? [] : [directAxiosImportPattern]),
    ...(allowServiceFactory ? [] : [serviceFactoryImportPattern]),
    ...(allowDomainMock ? [] : [domainMockImportPattern]),
    ...(allowApiRequest ? [] : [apiRequestImportPattern]),
    ...(allowDomainApiFunction ? [] : [domainApiFunctionImportPattern]),
    ...(forbidLayoutBusinessImports ? [workspaceLayoutBusinessImportPattern] : []),
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

const fileLengthRule = (limit) => ({
  meta: {
    type: 'suggestion',
    docs: { description: `限制单文件不超过 ${limit} 行` },
    schema: [],
    messages: { tooLong: '文件 {{actual}} 行，超过 {{limit}} 行门槛。' },
  },
  create(context) {
    return {
      Program(node) {
        const lines = context.sourceCode.lines;
        const actual = lines.length - (lines.at(-1) === '' ? 1 : 0);
        if (actual > limit) {
          context.report({
            node,
            messageId: 'tooLong',
            data: { actual, limit },
          });
        }
      },
    };
  },
});

const requireHookFileHeaderRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'use* hook 文件顶部必须有职责向文件头注释',
    },
    schema: [],
    messages: {
      missing: 'use* hook 文件顶部必须有 /** ... */ 头注释，只交代模块职责，不写实现细节。',
    },
  },
  create(context) {
    const filename = context.filename.split(/[/\\]/).pop() ?? '';
    if (!/^use[A-Z]/.test(filename)) return {};

    return {
      Program(node) {
        const sourceCode = context.sourceCode;
        const firstStatement = node.body[0];
        const leadingComments = firstStatement
          ? sourceCode.getCommentsBefore(firstStatement)
          : sourceCode.getAllComments();
        const header = leadingComments[0];
        const textBefore = header ? sourceCode.getText().slice(0, header.range[0]) : '';
        const isJsdoc =
          header?.type === 'Block' &&
          header.value.startsWith('*') &&
          /^\s*$/.test(textBefore) &&
          header.value.replace(/^\*/, '').trim().length > 0;

        if (!isJsdoc) {
          context.report({ node, messageId: 'missing' });
        }
      },
    };
  },
};

const noTypeCommentsRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: '禁止在类型定义及其成员上挂注释',
    },
    schema: [],
    messages: {
      forbidden: '禁止类型相关注释；类型靠命名自解释，不要在 interface/type/成员上写注释。',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const reported = new Set();

    const reportComment = (comment) => {
      const key = `${comment.range[0]}:${comment.range[1]}`;
      if (reported.has(key)) return;
      reported.add(key);
      context.report({ loc: comment.loc, messageId: 'forbidden' });
    };

    const reportLeading = (node) => {
      for (const comment of sourceCode.getCommentsBefore(node)) {
        reportComment(comment);
      }
    };

    const reportTrailingSameLine = (node) => {
      for (const comment of sourceCode.getCommentsAfter(node)) {
        if (comment.loc.start.line === node.loc.end.line) {
          reportComment(comment);
        }
      }
    };

    const commentTargetForDecl = (node) => {
      const parent = node.parent;
      if (
        parent &&
        (parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportDefaultDeclaration')
      ) {
        return parent;
      }
      return node;
    };

    return {
      TSInterfaceDeclaration(node) {
        reportLeading(commentTargetForDecl(node));
        reportTrailingSameLine(node);
      },
      TSTypeAliasDeclaration(node) {
        reportLeading(commentTargetForDecl(node));
        reportTrailingSameLine(node);
      },
      TSPropertySignature(node) {
        reportLeading(node);
        reportTrailingSameLine(node);
      },
      TSMethodSignature(node) {
        reportLeading(node);
        reportTrailingSameLine(node);
      },
      TSCallSignatureDeclaration(node) {
        reportLeading(node);
        reportTrailingSameLine(node);
      },
      TSConstructSignatureDeclaration(node) {
        reportLeading(node);
        reportTrailingSameLine(node);
      },
      TSIndexSignature(node) {
        reportLeading(node);
        reportTrailingSameLine(node);
      },
    };
  },
};

const noArbitraryThrowRule = {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止抛出字面量或未登记的错误构造器',
    },
    schema: [],
    messages: {
      forbidden:
        '禁止抛出字面量或未登记的错误构造器；新错误请使用 createClientError，API 传输边界使用 WisePenError，重抛时保留原错误对象。',
    },
  },
  create(context) {
    const allowedNewErrorConstructors = new Set(['PublicConfigError', 'WisePenError']);
    const unwrapExpression = (node) => {
      let current = node;
      while (
        current &&
        ['ChainExpression', 'TSAsExpression', 'TSNonNullExpression', 'TSTypeAssertion'].includes(
          current.type
        )
      ) {
        current = current.expression;
      }
      return current;
    };
    const isAllowedThrownValue = (rawNode) => {
      const node = unwrapExpression(rawNode);
      if (!node) return false;
      if (
        ['Identifier', 'MemberExpression', 'CallExpression', 'AwaitExpression'].includes(node.type)
      ) {
        return true;
      }
      return (
        node.type === 'NewExpression' &&
        node.callee.type === 'Identifier' &&
        allowedNewErrorConstructors.has(node.callee.name)
      );
    };
    const reportIfForbidden = (node, argument) => {
      if (!isAllowedThrownValue(argument)) context.report({ node, messageId: 'forbidden' });
    };

    return {
      ThrowStatement(node) {
        reportIfForbidden(node, node.argument);
      },
      CallExpression(node) {
        if (node.callee.type === 'MemberExpression') {
          const isPromiseReject =
            !node.callee.computed &&
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'Promise' &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'reject';
          if (isPromiseReject) reportIfForbidden(node, node.arguments[0]);
          return;
        }
        if (node.callee.type === 'Identifier' && node.callee.name === 'reject') {
          reportIfForbidden(node, node.arguments[0]);
        }
      },
    };
  },
};

const noDirectErrorToastRule = {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止业务代码直接展示错误 Toast',
    },
    schema: [],
    messages: {
      forbidden:
        '错误提示必须通过 useApi 或 notifyError / notifyErrorMessage 统一处理，不要在业务代码直接调用 toast.danger 或错误路径中的 toast.warning。',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const isToastMethod = (node, method) =>
      node.type === 'MemberExpression' &&
      !node.computed &&
      node.object.type === 'Identifier' &&
      node.object.name === 'toast' &&
      node.property.type === 'Identifier' &&
      node.property.name === method;
    const isErrorHandlingContext = (node) => {
      let current = node.parent;
      while (current) {
        if (current.type === 'CatchClause') return true;
        if (
          current.type === 'CallExpression' &&
          current.callee.type === 'MemberExpression' &&
          !current.callee.computed &&
          current.callee.property.type === 'Identifier' &&
          current.callee.property.name === 'catch' &&
          current.arguments.some(
            (argument) => argument.range[0] <= node.range[0] && node.range[1] <= argument.range[1]
          )
        ) {
          return true;
        }
        if (
          current.type === 'Property' &&
          current.key.type === 'Identifier' &&
          /^on(?:Error|.*Error)/.test(current.key.name)
        ) {
          return true;
        }
        current = current.parent;
      }
      return false;
    };

    return {
      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression') return;
        if (context.filename.endsWith('/src/utils/error/notifyError.ts')) return;
        if (isToastMethod(node.callee, 'danger')) {
          context.report({ node, messageId: 'forbidden' });
          return;
        }
        if (
          isToastMethod(node.callee, 'warning') &&
          (isErrorHandlingContext(node) ||
            (node.arguments[0] != null &&
              sourceCode.getText(node.arguments[0]).includes('parseErrorMessage')))
        ) {
          context.report({ node, messageId: 'forbidden' });
        }
      },
    };
  },
};

const noDirectWisePenErrorRule = {
  meta: {
    type: 'problem',
    docs: {
      description: '客户端代码统一通过 createClientError 创建错误',
    },
    schema: [],
    messages: {
      forbidden:
        '客户端代码禁止直接 new WisePenError；请使用 createClientError。网络、HTTP、API 边界除外。',
    },
  },
  create(context) {
    const filename = context.filename.replaceAll('\\', '/');
    const allowedPathPatterns = [
      /\/src\/apis\//,
      /\/src\/domains\/_shared\/apis\//,
      /\/src\/domains\/_shared\/mock\//,
      /\/src\/utils\/error\/createClientError\.ts$/,
    ];
    if (allowedPathPatterns.some((pattern) => pattern.test(filename))) return {};

    return {
      NewExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'WisePenError') {
          context.report({ node, messageId: 'forbidden' });
        }
      },
    };
  },
};

const wisePenPlugin = {
  rules: {
    'max-lines-error': fileLengthRule(600),
    'no-arbitrary-throw': noArbitraryThrowRule,
    'no-direct-error-toast': noDirectErrorToastRule,
    'no-direct-wise-pen-error': noDirectWisePenErrorRule,
    'no-hardcoded-frontend-route': noHardcodedFrontendRouteRule,
    'no-type-comments': noTypeCommentsRule,
    'require-hook-file-header': requireHookFileHeaderRule,
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
      '禁止 re-export *Services.impl —— createXxxServices 工厂只能在 src/domains/_registry/registry.ts 装配，index.ts 不得二次导出。',
  },
  {
    selector: 'ExportNamedDeclaration[source.value=/Services\\.impl(\\.[jt]sx?)?$/]',
    message:
      '禁止 re-export *Services.impl —— createXxxServices 工厂只能在 src/domains/_registry/registry.ts 装配，index.ts 不得二次导出。',
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
      'wisepen/no-direct-error-toast': 'warn',
      'wisepen/no-direct-wise-pen-error': 'warn',
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
      'no-restricted-syntax': [
        'error',
        ...projectRestrictedSyntaxRules,
        ...nativeErrorRestrictedSyntaxRules,
      ],
    },
  },
  {
    // Domain 业务代码新建错误必须走 createClientError；传输边界与 mock 模拟 API 错误除外。
    files: ['src/domains/**/*.{ts,tsx}'],
    ignores: [
      'src/domains/_shared/apis/**/*.{ts,tsx}',
      'src/domains/_shared/mock/**/*.{ts,tsx}',
      'src/domains/*/mock/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...projectRestrictedSyntaxRules,
        ...nativeErrorRestrictedSyntaxRules,
        {
          selector: "NewExpression[callee.name='WisePenError']",
          message:
            'Domain 内禁止直接 new WisePenError；请使用 createClientError。网络/HTTP 边界（apis、domains/_shared/apis）除外。',
        },
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
