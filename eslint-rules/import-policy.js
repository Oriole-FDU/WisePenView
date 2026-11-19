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

export const buildRestrictedImportsRule = ({
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
