import { componentConventionRule } from './component-conventions.js';
import { domainConventionRule } from './domain-conventions.js';

const noUseEffectRule = {
  meta: {
    type: 'problem',
    docs: {
      description: '默认禁止 useEffect',
    },
    schema: [],
    messages: {
      forbidden:
        '项目默认禁止 useEffect；请改为事件驱动、渲染期派生、useApi、生命周期 Hook 或领域 Hook。注释不能豁免该规则。',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const isNamedUseEffect =
          node.callee.type === 'Identifier' && node.callee.name === 'useEffect';
        const isReactUseEffect =
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'React' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'useEffect';
        if (isNamedUseEffect || isReactUseEffect) {
          context.report({ node, messageId: 'forbidden' });
        }
      },
    };
  },
};

const noMemoizedFnRule = {
  meta: {
    type: 'problem',
    docs: {
      description: '默认禁止 useMemoizedFn，所有调用只暴露为 warning',
    },
    schema: [],
    messages: {
      forbidden:
        'useMemoizedFn 会隐藏依赖关系并固化函数身份；仅第三方引用契约且必须读取最新闭包时使用。请优先使用普通函数或 useCallback，注释不能豁免。',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const isNamedUseMemoizedFn =
          node.callee.type === 'Identifier' && node.callee.name === 'useMemoizedFn';
        const isAhooksUseMemoizedFn =
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'ahooks' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'useMemoizedFn';
        if (isNamedUseMemoizedFn || isAhooksUseMemoizedFn) {
          context.report({ node, messageId: 'forbidden' });
        }
      },
    };
  },
};

const noMemoizationRule = {
  meta: {
    type: 'problem',
    docs: {
      description: '默认禁止 useMemo/useCallback，所有调用只暴露为 warning',
    },
    schema: [],
    messages: {
      forbidden:
        '项目默认禁止 useMemo/useCallback；只有可验证的计算瓶颈、引用身份契约或第三方依赖要求时使用。请优先普通计算或普通函数，注释不能豁免。',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const isNamedMemoizationCall =
          node.callee.type === 'Identifier' &&
          ['useMemo', 'useCallback'].includes(node.callee.name);
        const isReactMemoizationCall =
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'React' &&
          node.callee.property.type === 'Identifier' &&
          ['useMemo', 'useCallback'].includes(node.callee.property.name);
        if (isNamedMemoizationCall || isReactMemoizationCall) {
          context.report({ node, messageId: 'forbidden' });
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
        '禁止抛出字面量或未登记的错误构造器；新错误请使用 createDomainError / createComponentError，API 传输边界使用 WisePenError，重抛时保留原错误对象。',
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
        '错误提示必须通过 useApi 或 reportError 统一处理，不要在业务代码直接调用 toast.danger 或错误路径中的 toast.warning。',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const filename = context.filename.replaceAll('\\', '/');
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
        if (filename.endsWith('/src/utils/error/reportError.ts')) return;
        if (isToastMethod(node.callee, 'danger')) {
          context.report({ node, messageId: 'forbidden' });
          return;
        }
        if (
          isToastMethod(node.callee, 'warning') &&
          (isErrorHandlingContext(node) ||
            (node.arguments[0] != null &&
              /(?:parse|resolve)ErrorMessage/.test(sourceCode.getText(node.arguments[0]))))
        ) {
          context.report({ node, messageId: 'forbidden' });
        }
      },
    };
  },
};

const noLegacyErrorReportApiRule = {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止使用已废弃的错误提示 API，统一收束到 reportError',
    },
    schema: [],
    messages: {
      forbiddenImport:
        '请使用 reportError；notifyError / notifyErrorMessage / parseErrorMessage / resolveErrorMessage 不再作为业务入口。内联展示把 error 传给 Feedback。',
      forbiddenCall:
        '请使用 reportError 统一报告错误；不要直接调用 notifyError / notifyErrorMessage。',
      requireObjectArg: 'reportError 必须传入参数对象：reportError({ error, level })。',
      requireFields: 'reportError 强契约要求同时提供 error 与 level。',
      forbiddenInlineFactory:
        '先 createDomainError / createComponentError 赋给变量，再 reportError({ error, level })；禁止在参数里内联创建。',
      forbiddenLegacyFactory:
        '请使用 createDomainError / createComponentError，不要再使用 createClientError。',
    },
  },
  create(context) {
    const filename = context.filename.replaceAll('\\', '/');
    if (filename.includes('/src/utils/error/')) return {};

    const bannedImportNames = new Set([
      'notifyError',
      'notifyErrorMessage',
      'resolveErrorMessage',
      'parseErrorMessage',
      'createClientError',
      'FRONTEND_CLIENT_ERROR',
    ]);
    const bannedCallNames = new Set(['notifyError', 'notifyErrorMessage', 'createClientError']);
    const errorFactoryNames = new Set([
      'createDomainError',
      'createComponentError',
      'createClientError',
    ]);
    const requiredKeys = new Set(['error', 'level']);

    const readPropertyName = (property) => {
      if (property.type !== 'Property' || property.computed) return null;
      if (property.key.type === 'Identifier') return property.key.name;
      if (property.key.type === 'Literal' && typeof property.key.value === 'string') {
        return property.key.value;
      }
      return null;
    };

    const isInlineErrorFactory = (value) =>
      value?.type === 'CallExpression' &&
      value.callee.type === 'Identifier' &&
      errorFactoryNames.has(value.callee.name);

    return {
      ImportDeclaration(node) {
        if (typeof node.source.value !== 'string') return;
        const source = node.source.value;

        // 禁止 deep-import parseErrorMessage；仅 Feedback 与 reportError 可消费
        if (
          source === '@/utils/error/parseErrorMessage' ||
          source.endsWith('/utils/error/parseErrorMessage')
        ) {
          const allowParse =
            /\/src\/components\/base\/Feedback\//.test(filename) ||
            /\/src\/utils\/error\/reportError\.ts$/.test(filename);
          if (!allowParse) {
            context.report({ node, messageId: 'forbiddenImport' });
            return;
          }
        }

        // 公共 barrel：禁止业务导入已废弃符号
        if (source !== '@/utils/error') return;
        for (const specifier of node.specifiers) {
          if (specifier.type !== 'ImportSpecifier') continue;
          const imported =
            specifier.imported.type === 'Identifier' ? specifier.imported.name : null;
          if (imported && bannedImportNames.has(imported)) {
            context.report({
              node: specifier,
              messageId:
                imported === 'createClientError' ? 'forbiddenLegacyFactory' : 'forbiddenImport',
            });
          }
        }
      },
      CallExpression(node) {
        if (node.callee.type !== 'Identifier') return;
        if (bannedCallNames.has(node.callee.name)) {
          context.report({
            node,
            messageId:
              node.callee.name === 'createClientError' ? 'forbiddenLegacyFactory' : 'forbiddenCall',
          });
          return;
        }
        if (node.callee.name !== 'reportError') return;
        const [firstArg] = node.arguments;
        if (!firstArg || firstArg.type !== 'ObjectExpression' || node.arguments.length !== 1) {
          context.report({ node, messageId: 'requireObjectArg' });
          return;
        }
        const keys = new Set();
        for (const property of firstArg.properties) {
          const name = readPropertyName(property);
          if (name) keys.add(name);
          if (
            name === 'error' &&
            property.type === 'Property' &&
            !property.shorthand &&
            isInlineErrorFactory(property.value)
          ) {
            context.report({ node: property.value, messageId: 'forbiddenInlineFactory' });
          }
        }
        if (![...requiredKeys].every((key) => keys.has(key))) {
          context.report({ node, messageId: 'requireFields' });
        }
      },
    };
  },
};

const noDirectWisePenErrorRule = {
  meta: {
    type: 'problem',
    docs: {
      description: '客户端代码统一通过 createDomainError / createComponentError 创建错误',
    },
    schema: [],
    messages: {
      forbidden:
        '禁止直接 new WisePenError；Domain 用 createDomainError，Component 用 createComponentError。网络、HTTP、API 边界除外。',
    },
  },
  create(context) {
    const filename = context.filename.replaceAll('\\', '/');
    const allowedPathPatterns = [
      /\/src\/apis\//,
      /\/src\/domains\/_shared\/apis\//,
      /\/src\/domains\/_shared\/mock\//,
      /\/src\/utils\/error\/createDomainError\.ts$/,
      /\/src\/utils\/error\/createComponentError\.ts$/,
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

export const wisePenPlugin = {
  rules: {
    'component-conventions': componentConventionRule,
    'domain-conventions': domainConventionRule,
    'max-lines-error': fileLengthRule(600),
    'no-arbitrary-throw': noArbitraryThrowRule,
    'no-direct-error-toast': noDirectErrorToastRule,
    'no-direct-wise-pen-error': noDirectWisePenErrorRule,
    'no-legacy-error-report-api': noLegacyErrorReportApiRule,
    'no-hardcoded-frontend-route': noHardcodedFrontendRouteRule,
    'no-memoized-fn': noMemoizedFnRule,
    'no-memoization': noMemoizationRule,
    'no-type-comments': noTypeCommentsRule,
    'require-hook-file-header': requireHookFileHeaderRule,
    'no-use-effect': noUseEffectRule,
  },
};
