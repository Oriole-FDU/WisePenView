// 服务端查询入口约束；状态与业务空值由 TypeScript 契约、selector 和消费端负责。
// 对应规范：agent/docs/query.md。
const requestHooks = new Set(['useRequest', 'usePagination', 'useInfiniteScroll']);
const localTaskDirectories = [
  '/src/components/base/Markdown/CodeBlock/',
  '/src/components/base/Markdown/MermaidBlock/',
  '/src/components/editors/note/CustomBlockNote/plugins/MermaidPlugin/MermaidBlock/',
];
const getPropertyName = (node) => (node.computed ? node.property.value : node.property.name);
const isAhooks = (source) => source === 'ahooks' || /^ahooks\/(?:es|lib)\//.test(source);
const getSubpathHook = (source) => source.match(/^ahooks\/(?:es|lib)\/(use\w+)(?:\/|$)/)?.[1];

const noDirectServerQuery = {
  meta: {
    type: 'problem',
    docs: { description: '服务端请求必须经过项目查询入口，本地渲染异步任务按目录保留' },
    schema: [],
    messages: {
      forbidden: '{{hook}} 必须通过 @/hooks/useApi；本地高亮与 Mermaid 渲染目录仅允许 useRequest。',
    },
  },
  create(context) {
    const filename = `/${context.filename.replaceAll('\\', '/')}`;
    if (/\/src\/hooks\/query\//.test(filename)) return {};
    const sourceCode = context.sourceCode;
    const imports = sourceCode.ast.body.filter((node) => node.type === 'ImportDeclaration');
    const hasServerImport = imports.some((node) =>
      /^(?:@\/|(?:\.\.\/)+)(?:domains|apis)(?:\/|$)/.test(node.source.value)
    );
    const localTask =
      localTaskDirectories.some((directory) => filename.includes(directory)) && !hasServerImport;
    const forbidden = (hook) => requestHooks.has(hook) && !(hook === 'useRequest' && localTask);
    const report = (node, hook) => {
      if (forbidden(hook)) context.report({ node, messageId: 'forbidden', data: { hook } });
    };
    const findVariable = (name, node) => {
      let scope = sourceCode.getScope(node);
      while (scope) {
        const variable = scope.set.get(name);
        if (variable) return variable;
        scope = scope.upper;
      }
    };
    const isAhooksNamespace = (node, seen = new Set()) => {
      if (node.type !== 'Identifier' || seen.has(node.name)) return false;
      seen.add(node.name);
      const definition = findVariable(node.name, node)?.defs[0];
      if (definition?.type === 'ImportBinding') {
        return (
          ['ImportNamespaceSpecifier', 'ImportDefaultSpecifier'].includes(definition.node.type) &&
          isAhooks(definition.parent.source.value)
        );
      }
      return definition?.type === 'Variable' && definition.node.init
        ? isAhooksNamespace(definition.node.init, seen)
        : false;
    };
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (!isAhooks(source) || node.importKind === 'type') return;
        for (const specifier of node.specifiers) {
          if (specifier.importKind === 'type') continue;
          if (specifier.type === 'ImportSpecifier') {
            report(
              specifier,
              getSubpathHook(source) ?? specifier.imported.name ?? specifier.imported.value
            );
          } else if (
            ['ImportDefaultSpecifier', 'ImportNamespaceSpecifier'].includes(specifier.type)
          ) {
            report(specifier, getSubpathHook(source));
          }
        }
      },
      MemberExpression(node) {
        if (isAhooksNamespace(node.object)) report(node, getPropertyName(node));
      },
      VariableDeclarator(node) {
        if (node.id.type !== 'ObjectPattern' || !node.init || !isAhooksNamespace(node.init)) return;
        for (const property of node.id.properties) {
          if (property.type === 'Property')
            report(property, property.key.name ?? property.key.value);
        }
      },
      ExportNamedDeclaration(node) {
        if (!node.source || !isAhooks(node.source.value) || node.exportKind === 'type') return;
        for (const specifier of node.specifiers) {
          if (specifier.exportKind === 'type') continue;
          report(specifier, getSubpathHook(node.source.value) ?? specifier.local.name);
        }
      },
      ExportAllDeclaration(node) {
        if (node.exportKind !== 'type' && node.source.value === 'ahooks')
          report(node, 'useRequest');
      },
    };
  },
};

export const queryRules = { 'no-direct-server-query': noDirectServerQuery };
