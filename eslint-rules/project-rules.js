import { contractRules } from '../lint/contracts.js';
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

export const wisePenPlugin = {
  rules: {
    ...contractRules,
    'component-conventions': componentConventionRule,
    'domain-conventions': domainConventionRule,
    'max-lines-error': fileLengthRule(600),
    'no-hardcoded-frontend-route': noHardcodedFrontendRouteRule,
    'no-memoized-fn': noMemoizedFnRule,
    'no-memoization': noMemoizationRule,
    'no-type-comments': noTypeCommentsRule,
    'require-hook-file-header': requireHookFileHeaderRule,
    'no-use-effect': noUseEffectRule,
  },
};
