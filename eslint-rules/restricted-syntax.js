import {
  domainWisePenErrorRestrictedSyntaxRule,
  nativeErrorRestrictedSyntaxRules,
} from '../lint/error.js';

export const projectRestrictedProperties = [
  {
    object: 'ahooks',
    property: 'useUpdateEffect',
    message: '项目禁止 ahooks.useUpdateEffect；请改为事件驱动、渲染期派生、useApi 或领域 Hook。',
  },
];

export const projectRestrictedSyntaxRules = [
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

export const clientRuntimeRestrictedSyntaxRules = [
  ...projectRestrictedSyntaxRules,
  ...nativeErrorRestrictedSyntaxRules,
];

export const domainRestrictedSyntaxRules = [
  ...clientRuntimeRestrictedSyntaxRules,
  domainWisePenErrorRestrictedSyntaxRule,
];
