// =============================================================================
// lint/error — 前端错误契约（createError / reportError）
// docs: agent/docs/error.md
// updated: 2026-11-27
//
// 检查项：
// - 禁止 throw / reject 字面量或未登记的错误构造器（应 createError 后抛）
// - 禁止任何位置直接 new WisePenError（仅 createError.ts 可构造）
// - 禁止直接 new Error() / Error()（可预期失败走 createError）
// - 禁止 createClientError / notifyError / notifyErrorMessage（改 createError / reportError）
// - 禁止业务侧直接 captureException（改 reportError；基础设施与 reportError 除外）
// - 禁止 Domain / API / 共享工具内 reportError（只抛不报）
// - 禁止业务侧 toast.danger，以及错误路径上的 toast.warning / toast.info
// =============================================================================

const toPosix = (filename) => filename.replaceAll('\\', '/');

const isCallNamed = (node, name) =>
  node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === name;

const noArbitraryThrowRule = {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止抛出字面量或未登记的错误构造器',
    },
    schema: [],
    messages: {
      forbidden:
        '禁止抛出字面量或未登记的错误构造器；请 createError 后 throw，或重抛已有错误对象。',
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
      forbidden: '错误提示必须通过 reportError 统一处理，不要直接 toast + parseErrorMessage。',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const filename = toPosix(context.filename);
    if (/\/src\/utils\/error\/reportError\.ts$/.test(filename)) return {};

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
        if (isToastMethod(node.callee, 'danger')) {
          context.report({ node, messageId: 'forbidden' });
          return;
        }
        if (
          (isToastMethod(node.callee, 'warning') || isToastMethod(node.callee, 'info')) &&
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
      description: '禁止直接 new WisePenError',
    },
    schema: [],
    messages: {
      forbidden: '禁止直接 new WisePenError；请使用 createError。',
    },
  },
  create(context) {
    const filename = toPosix(context.filename);
    if (/\/src\/utils\/error\/createError\.ts$/.test(filename)) return {};

    return {
      NewExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'WisePenError') {
          context.report({ node, messageId: 'forbidden' });
        }
      },
    };
  },
};

const noLegacyErrorApiRule = {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止旧错误入口 createClientError / notifyError',
    },
    schema: [],
    messages: {
      createClientError: '禁止 createClientError；请使用 createError。',
      notifyError: '禁止 notifyError / notifyErrorMessage；请使用 reportError。',
    },
  },
  create(context) {
    const filename = toPosix(context.filename);
    if (/\/src\/utils\/error\/(createClientError|notifyError)\.ts$/.test(filename)) return {};

    return {
      CallExpression(node) {
        if (isCallNamed(node, 'createClientError')) {
          context.report({ node, messageId: 'createClientError' });
          return;
        }
        if (isCallNamed(node, 'notifyError') || isCallNamed(node, 'notifyErrorMessage')) {
          context.report({ node, messageId: 'notifyError' });
        }
      },
      ImportSpecifier(node) {
        const name = node.imported.type === 'Identifier' ? node.imported.name : null;
        if (name === 'createClientError') {
          context.report({ node, messageId: 'createClientError' });
          return;
        }
        if (name === 'notifyError' || name === 'notifyErrorMessage') {
          context.report({ node, messageId: 'notifyError' });
        }
      },
    };
  },
};

const noDirectCaptureExceptionRule = {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止业务侧直接 captureException',
    },
    schema: [],
    messages: {
      forbidden: '禁止直接 captureException；消费边界请使用 reportError。',
    },
  },
  create(context) {
    const filename = toPosix(context.filename);
    const allowed = [
      /\/src\/observability\//,
      /\/src\/utils\/error\/reportError\.ts$/,
      /\/src\/main\.tsx$/,
      /\/src\/bootstrap\//,
    ];
    if (allowed.some((pattern) => pattern.test(filename))) return {};

    return {
      CallExpression(node) {
        if (isCallNamed(node, 'captureException')) {
          context.report({ node, messageId: 'forbidden' });
        }
      },
      ImportSpecifier(node) {
        if (node.imported.type === 'Identifier' && node.imported.name === 'captureException') {
          context.report({ node, messageId: 'forbidden' });
        }
      },
    };
  },
};

const noReportErrorOutsideBoundaryRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Domain / API / 工具层禁止 reportError',
    },
    schema: [],
    messages: {
      forbidden:
        'Domain / API / 共享工具只抛不报；请 createError 后 throw，由消费边界 reportError。',
    },
  },
  create(context) {
    const filename = toPosix(context.filename);
    const forbiddenLayers = [/\/src\/domains\//, /\/src\/apis\//, /\/src\/utils\//];
    const isForbiddenLayer = forbiddenLayers.some((pattern) => pattern.test(filename));
    if (!isForbiddenLayer) return {};
    if (/\/src\/utils\/error\/reportError\.ts$/.test(filename)) return {};

    return {
      CallExpression(node) {
        if (isCallNamed(node, 'reportError')) {
          context.report({ node, messageId: 'forbidden' });
        }
      },
      ImportSpecifier(node) {
        if (node.imported.type === 'Identifier' && node.imported.name === 'reportError') {
          context.report({ node, messageId: 'forbidden' });
        }
      },
    };
  },
};

/** wisepen 插件规则：error 关注点 */
export const errorRules = {
  'no-arbitrary-throw': noArbitraryThrowRule,
  'no-direct-error-toast': noDirectErrorToastRule,
  'no-direct-wise-pen-error': noDirectWisePenErrorRule,
  'no-legacy-error-api': noLegacyErrorApiRule,
  'no-direct-capture-exception': noDirectCaptureExceptionRule,
  'no-report-error-outside-boundary': noReportErrorOutsideBoundaryRule,
};

/** no-restricted-syntax：禁止原生 Error */
export const nativeErrorRestrictedSyntaxRules = [
  {
    selector: "NewExpression[callee.name='Error']",
    message: '禁止直接创建原生 Error；请使用 createError。',
  },
  {
    selector: "CallExpression[callee.name='Error']",
    message: '禁止直接创建原生 Error；请使用 createError。',
  },
];

/** no-restricted-syntax：Domain 内禁止 new WisePenError（含 apis / mock） */
export const domainWisePenErrorRestrictedSyntaxRule = {
  selector: "NewExpression[callee.name='WisePenError']",
  message: 'Domain 内禁止直接 new WisePenError；请使用 createError。',
};
