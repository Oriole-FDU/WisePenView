import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { componentTodos } from './component-todos.js';

const ROOT = /^src\/(?:components|views|layouts)\//;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
const AUXILIARY = /\.(?:stories|test|spec)(?:\.[jt]sx?|\.module\.(?:scss|css))$/;
const PRIVATE = new Set(['_parts', '_hooks', '_common']);
const FILES = new Set(['index.tsx', 'index.type.ts', 'style.module.scss', 'BUSINESS.md']);
const DIRECTORIES = new Set(['_parts', '_hooks', '_common', 'assets']);
const normalize = (value) => value.split(path.sep).join('/');
const within = (parent, child) => child === parent || child.startsWith(`${parent}/`);

const resolveImport = (cwd, filename, specifier) => {
  let target;
  if (specifier.startsWith('@/')) target = path.join(cwd, 'src', specifier.slice(2));
  else if (specifier.startsWith('.')) target = path.resolve(path.dirname(filename), specifier);
  else return null;
  return (
    [target, ...['.ts', '.tsx', '.js', '/index.ts', '/index.tsx'].map((ext) => target + ext)].find(
      (candidate) => existsSync(candidate)
    ) ?? target
  );
};

const unwrap = (node) => {
  let value = node;
  while (
    value &&
    ['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression'].includes(value.type)
  ) {
    value = value.expression;
  }
  return value;
};

// 沿本地 memo／forwardRef／Object.assign 绑定定位主实现，避免把别名误认为子组件。
const mainImplementation = (node, bindings, wrappers, seen = new Set()) => {
  const value = unwrap(node);
  if (!value || seen.has(value)) return value;
  seen.add(value);
  if (value.type === 'Identifier') {
    return bindings.has(value.name)
      ? mainImplementation(bindings.get(value.name), bindings, wrappers, seen)
      : value;
  }
  if (value.type === 'CallExpression') {
    const callee = value.callee;
    const known =
      callee.type === 'Identifier'
        ? wrappers.has(callee.name)
        : callee.type === 'MemberExpression' &&
          !callee.computed &&
          ((callee.object.name === 'Object' && callee.property.name === 'assign') ||
            (wrappers.has(callee.object.name) &&
              ['memo', 'forwardRef'].includes(callee.property.name)));
    if (known) return mainImplementation(value.arguments[0], bindings, wrappers, seen);
  }
  return value;
};

const declarationName = (node) =>
  node?.id?.name ?? (node?.parent?.type === 'VariableDeclarator' ? node.parent.id.name : undefined);

const typeOnlyStatement = (node) => {
  if (['TSInterfaceDeclaration', 'TSTypeAliasDeclaration', 'EmptyStatement'].includes(node.type))
    return true;
  if (node.type === 'ImportDeclaration') {
    return (
      node.importKind === 'type' ||
      (node.specifiers.length > 0 && node.specifiers.every((item) => item.importKind === 'type'))
    );
  }
  if (node.type === 'ExportDefaultDeclaration') return typeOnlyStatement(node.declaration);
  if (node.type === 'ExportAllDeclaration') return node.exportKind === 'type';
  if (node.type === 'ExportNamedDeclaration') {
    if (node.declaration) return typeOnlyStatement(node.declaration);
    return (
      node.exportKind === 'type' ||
      (node.specifiers.length > 0 && node.specifiers.every((item) => item.exportKind === 'type')) ||
      (!node.source && node.specifiers.length === 0)
    );
  }
  return false;
};

const messages = {
  entry: '组件实现必须使用 PascalCase/index.tsx：{{detail}}。',
  name: '组件目录名和主导出必须一致：{{detail}}。',
  types: '有参数或公开类型契约的组件必须包含 index.type.ts：{{detail}}。',
  publicType: '组件公开 Props／Ref／Handle 类型必须放在 index.type.ts：{{detail}}。',
  typeImport: '组件主参数类型必须通过自身 index.type.ts 定义或显式按类型再导出：{{detail}}。',
  inlineType: '组件参数的公开类型不能内联定义，请移到 index.type.ts：{{detail}}。',
  runtimeType: 'index.type.ts 只能声明、导入或导出类型：{{detail}}。',
  member: '组件根部仅允许入口、类型、按需样式、_parts/_hooks/_common 和附属资源：{{detail}}。',
  privateImport: '不能从组件范围外导入私有 _parts/_hooks/_common：{{detail}}。',
  privateStyle: '组件私有样式不能被其它组件借用；共享样式放在共同 owner 的 _common：{{detail}}。',
  styleName: '组件自身或 _common 的共享样式统一命名为 style.module.scss：{{detail}}。',
  multiple: '一个组件入口只定义一个 UI 组件，私有子组件请放入 _parts：{{detail}}。',
  invalidTodo: '组件迁移 TODO 必须说明原因并列出仍存在的具体诊断：{{detail}}。',
  staleTodo: '组件迁移 TODO 已无对应诊断，请删除：{{detail}}。',
};

export const componentStructureRule = {
  meta: {
    type: 'problem',
    docs: { description: '组件目录、公开类型和私有依赖契约' },
    schema: [],
    messages,
  },
  create(context) {
    const cwd = context.cwd;
    const filename = context.filename;
    const relative = normalize(path.relative(cwd, filename));
    if (!relative.startsWith('src/') || relative.startsWith('src/components/_shadcn/')) return {};
    const basename = path.basename(filename);
    const directory = path.dirname(filename);
    const isComponentArea = ROOT.test(relative);
    const isEntry = isComponentArea && basename === 'index.tsx';
    const isAuxiliary = AUXILIARY.test(basename);
    const todo = componentTodos[relative];
    const seen = new Map();
    const allowed = new Map();
    for (const diagnostic of todo?.diagnostics ?? []) {
      allowed.set(diagnostic, (allowed.get(diagnostic) ?? 0) + 1);
    }
    const componentDirectories = [];
    let cursor = directory;
    const sourceRoot = path.join(cwd, 'src');
    while (within(sourceRoot, cursor)) {
      if (existsSync(path.join(cursor, 'index.tsx'))) componentDirectories.push(cursor);
      cursor = path.dirname(cursor);
    }
    const report = (node, messageId, detail) => {
      const key = `${messageId}:${detail}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
      if (seen.get(key) <= (allowed.get(key) ?? 0)) return;
      context.report({ node, messageId, data: { detail } });
    };
    const importTarget = (node, source) => {
      if (typeof source !== 'string') return;
      const target = resolveImport(cwd, filename, source);
      if (!target) return;
      const targetRelative = normalize(path.relative(cwd, target));
      if (!ROOT.test(targetRelative) || targetRelative.startsWith('src/components/_shadcn/'))
        return;
      const segments = targetRelative.split('/');
      for (let index = 0; index < segments.length; index += 1) {
        if (!PRIVATE.has(segments[index])) continue;
        const owner = segments.slice(0, index).join('/');
        if (!existsSync(path.join(cwd, owner, 'index.tsx'))) continue;
        if (!within(owner, relative)) {
          report(node, 'privateImport', targetRelative);
          break;
        }
      }
      if (!/\.module\.(?:scss|css)$/.test(target) || AUXILIARY.test(path.basename(target))) return;
      const owner = path.dirname(target);
      if (
        (existsSync(path.join(owner, 'index.tsx')) || path.basename(owner) === '_common') &&
        path.basename(target) !== 'style.module.scss'
      ) {
        report(node, 'styleName', targetRelative);
      }
      if (!existsSync(path.join(owner, 'index.tsx'))) return;
      if (!componentDirectories.includes(owner) || componentDirectories[0] !== owner) {
        report(node, 'privateStyle', targetRelative);
      }
    };
    const jsxFunctions = new Set();
    return {
      ImportDeclaration(node) {
        importTarget(node.source, node.source.value);
      },
      ExportNamedDeclaration(node) {
        if (node.source) importTarget(node.source, node.source.value);
      },
      ExportAllDeclaration(node) {
        importTarget(node.source, node.source.value);
      },
      ImportExpression(node) {
        importTarget(node.source, node.source.value);
      },
      TSImportType(node) {
        const source = node.argument?.literal ?? node.argument;
        if (source) importTarget(source, source.value);
      },
      ReturnStatement(node) {
        if (node.argument?.type !== 'Literal' || node.argument.value !== null) return;
        let parent = node.parent;
        while (
          parent &&
          !['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
            parent.type
          )
        )
          parent = parent.parent;
        // 无界面的生命周期组件也必须遵循入口与类型约定。
        if (parent && PASCAL.test(declarationName(parent) ?? '')) jsxFunctions.add(parent);
      },
      JSXElement(node) {
        let parent = node.parent;
        while (
          parent &&
          !['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
            parent.type
          )
        )
          parent = parent.parent;
        if (parent) jsxFunctions.add(parent);
      },
      JSXFragment(node) {
        let parent = node.parent;
        while (
          parent &&
          !['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
            parent.type
          )
        )
          parent = parent.parent;
        if (parent) jsxFunctions.add(parent);
      },
      'Program:exit'(program) {
        // 默认与专题扫描均包含应用入口，用同一规则拒绝已删除文件留下的清单。
        if (relative === 'src/main.tsx') {
          for (const file of Object.keys(componentTodos)) {
            if (!existsSync(path.join(cwd, file))) {
              context.report({ node: program, messageId: 'staleTodo', data: { detail: file } });
            }
          }
        }
        if (isComponentArea && basename === 'index.type.ts') {
          for (const statement of program.body) {
            if (!typeOnlyStatement(statement)) report(statement, 'runtimeType', statement.type);
          }
        }
        if (isEntry) {
          const folder = path.basename(directory);
          if (!PASCAL.test(folder)) report(program, 'entry', relative);
          const bindings = new Map();
          const wrappers = new Set();
          const typeImports = new Map();
          for (const statement of program.body) {
            if (statement.type !== 'ImportDeclaration') continue;
            for (const specifier of statement.specifiers) {
              typeImports.set(specifier.local.name, statement.source.value);
              if (statement.source.value !== 'react') continue;
              if (
                specifier.type === 'ImportNamespaceSpecifier' ||
                specifier.type === 'ImportDefaultSpecifier' ||
                ['memo', 'forwardRef'].includes(specifier.imported?.name)
              )
                wrappers.add(specifier.local.name);
            }
          }
          for (const statement of program.body) {
            const declaration =
              statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
            if (declaration?.type === 'VariableDeclaration') {
              for (const variable of declaration.declarations) {
                if (variable.id.type === 'Identifier')
                  bindings.set(variable.id.name, variable.init);
              }
            } else if (declaration?.type === 'FunctionDeclaration' && declaration.id) {
              bindings.set(declaration.id.name, declaration);
            }
          }
          const exported = program.body.find((node) => node.type === 'ExportDefaultDeclaration');
          const named = program.body.find(
            (node) =>
              node.type === 'ExportNamedDeclaration' &&
              (node.declaration?.type === 'FunctionDeclaration' ||
                node.declaration?.type === 'VariableDeclaration')
          );
          const declaration = exported?.declaration ?? named?.declaration;
          const candidate =
            declaration?.type === 'VariableDeclaration'
              ? declaration.declarations[0]?.init
              : declaration;
          const main = mainImplementation(candidate, bindings, wrappers);
          const implementationName =
            declarationName(main) ?? (main?.type === 'Identifier' ? main.name : undefined);
          const publicName =
            declaration?.type === 'VariableDeclaration'
              ? declaration.declarations[0]?.id.name
              : unwrap(declaration)?.type === 'Identifier'
                ? unwrap(declaration).name
                : declarationName(declaration);
          const name =
            publicName === folder || implementationName === folder
              ? folder
              : (publicName ?? implementationName);
          if (name && PASCAL.test(name) && name !== folder)
            report(exported ?? named, 'name', `${folder} -> ${name}`);
          const componentFunctions = [...jsxFunctions].filter(
            (fn) => fn === main || PASCAL.test(declarationName(fn) ?? '')
          );
          const publicTypes = program.body
            .map((statement) =>
              statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
            )
            .filter(
              (item) =>
                ['TSInterfaceDeclaration', 'TSTypeAliasDeclaration'].includes(item?.type) &&
                /(?:Props|Ref|Handle)$/.test(item.id.name)
            );
          // 只对已定位到零参数实现的组件豁免；显式组件类型和包装器泛型仍是公开契约。
          const hasComponentType = (node, visited = new Set()) => {
            if (['TSAsExpression', 'TSSatisfiesExpression'].includes(node?.type)) return true;
            const value = unwrap(node);
            if (!value || visited.has(value)) return false;
            visited.add(value);
            if (value.parent?.type === 'VariableDeclarator' && value.parent.id.typeAnnotation)
              return true;
            if (value.type === 'Identifier')
              return hasComponentType(bindings.get(value.name), visited);
            if (value.type === 'CallExpression')
              return Boolean(value.typeArguments) || hasComponentType(value.arguments[0], visited);
            return false;
          };
          const needsTypes =
            !Array.isArray(main?.params) ||
            main.params.length > 0 ||
            componentFunctions.some((fn) => fn.params.length > 0) ||
            publicTypes.length > 0 ||
            hasComponentType(candidate);
          if (needsTypes && !existsSync(path.join(directory, 'index.type.ts')))
            report(program, 'types', normalize(path.relative(cwd, directory)));
          for (const item of readdirSync(directory, { withFileTypes: true })) {
            if (item.name.startsWith('.')) continue;
            if (item.isDirectory()) {
              if (!DIRECTORIES.has(item.name))
                report(
                  program,
                  'member',
                  `${normalize(path.relative(cwd, directory))}/${item.name}/`
                );
            } else if (!FILES.has(item.name) && !AUXILIARY.test(item.name)) {
              report(program, 'member', `${normalize(path.relative(cwd, directory))}/${item.name}`);
            }
          }
          for (const declaration of publicTypes)
            report(declaration, 'publicType', declaration.id.name);
          for (const fn of jsxFunctions) {
            const componentName =
              fn.id?.name ??
              (fn.parent.type === 'VariableDeclarator' ? fn.parent.id.name : undefined);
            if (fn !== main && (!componentName || !PASCAL.test(componentName))) continue;
            if (main && fn !== main && componentName !== name)
              report(fn, 'multiple', componentName);
            for (const parameter of fn.params) {
              const annotation = parameter.typeAnnotation?.typeAnnotation;
              if (annotation?.type === 'TSTypeLiteral')
                report(parameter, 'inlineType', componentName ?? folder);
              if (
                fn === main &&
                annotation?.type === 'TSTypeReference' &&
                annotation.typeName.type === 'Identifier'
              ) {
                const typeName = annotation.typeName.name;
                const source = typeImports.get(typeName);
                if (
                  source &&
                  resolveImport(cwd, filename, source) !== path.join(directory, 'index.type.ts')
                )
                  report(parameter, 'typeImport', `${typeName} <- ${source}`);
              }
            }
          }
        } else if (
          isComponentArea &&
          !isAuxiliary &&
          basename.endsWith('.tsx') &&
          !relative.includes('/_common/context/') &&
          !relative.includes('/_context/')
        ) {
          for (const fn of jsxFunctions) {
            const name =
              fn.id?.name ??
              (fn.parent.type === 'VariableDeclarator' ? fn.parent.id.name : undefined);
            if (name && PASCAL.test(name)) report(fn, 'entry', `${relative} (${name})`);
          }
        }
        if (todo && (!todo.reason?.trim() || !todo.diagnostics?.length)) {
          context.report({ node: program, messageId: 'invalidTodo', data: { detail: relative } });
        }
        for (const [diagnostic, count] of allowed) {
          if ((seen.get(diagnostic) ?? 0) < count)
            context.report({ node: program, messageId: 'staleTodo', data: { detail: diagnostic } });
        }
      },
    };
  },
};

export const componentRules = { 'component-structure': componentStructureRule };
