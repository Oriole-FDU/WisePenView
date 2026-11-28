// 错误契约规则；本次仅从现有配置抽取，保留主干行为与提示。
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

export const errorRules = {
  'no-arbitrary-throw': noArbitraryThrowRule,
  'no-direct-error-toast': noDirectErrorToastRule,
  'no-direct-wise-pen-error': noDirectWisePenErrorRule,
};

export const nativeErrorRestrictedSyntaxRules = [
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

export const domainWisePenErrorRestrictedSyntaxRule = {
  selector: "NewExpression[callee.name='WisePenError']",
  message:
    'Domain 内禁止直接 new WisePenError；请使用 createClientError。网络/HTTP 边界（apis、domains/_shared/apis）除外。',
};
