# Domain Service 规范

Service 层位于 `src/domains/<Domain>/service`，负责业务编排和错误抛出。它是 view/component 获取领域能力的主要入口。

## 一、职责

Service 应负责：

- 编排一个或多个 API 调用。
- 调用 mapper 完成请求参数和响应数据转换。
- 做必要的客户端业务校验。
- 抛出 `WisePenError`；客户端校验使用 `createClientError` 创建。
- 管理领域内缓存、session 或跨请求状态，前提是职责清晰。

Service 不应负责：

- 展示 UI 提示。
- 直接操作 React 组件状态。
- 直接 import `@/apis/Axios`。
- 把后端 raw response 透传给组件。
- 直接 import 其它 service 的实现文件。

## 二、依赖注入

业务代码通过 `useXxxService()` 获取 service。

正式與 mock 共用 `src/domains/_registry/registry.ts` 的 service 裝配。跨 service 依賴必須由工廠參數注入。

Service 透過 `@domain-apis` 呼叫 API；Vite mock 模式與 Storybook 選擇 `apis.mock.ts`，其他模式選擇 `apis.impl.ts`。mock 只模擬 API 回應與外部 I/O，不另寫 service、mapper 或前端快取。

标准实现形态：

```ts
export const createXxxServices = (deps?: XxxServiceDeps): IXxxService => ({
  fetchSomething,
});
```

装配层级：

- Level 0：无跨 service 依赖，工厂无参。
- Level 1：依赖 Level 0，通过 `deps` 注入。
- Level 2+：继续在 registry 中显式分层装配。

禁止：

- `*Services.impl.ts` 之间直接 import 彼此实现。
- 在工厂之外的模块顶层执行跨 service 调用或副作用注册。
- 组件直接 import `*Services.impl.ts` 或 mock API。

## 三、错误处理

- Service 只抛错，不做 UI 提示。
- 客户端业务校验错误使用 `createClientError(code, meta?, cause?)`。
- 主动创建的错误不得使用原生 `Error`；网络、HTTP、API 边界按来源创建 `WisePenError`。
- 捕获已有错误仅为补充上下文时，应通过 `cause` 保留原异常；无需补充时直接向上抛出。
- UI 层 catch 后使用 HeroUI `toast` 和 `parseErrorMessage(err)`。
- `parseErrorMessage` 只接收一个 `unknown` 参数，不传 fallback 文案。
- 网络、HTTP、API 边界只归一化 `code`、`serverMsg` 和 `cause`，不在传输层查 i18n 或拼接用户文案；文案解析只发生在 `parseErrorMessage`。

## 四、请求触发

- React 组件或 Hook 中调用 service 的异步请求，默认使用 `@/hooks/useApi`、`useApiPagination` 或 `useApiInfiniteScroll`。
- 用户交互触发请求使用 `useApi(fn, { manual: true })`。
- 初始化请求使用 `ready`、`refreshDeps` 或领域 session hook 管理时机。
- 新建后跳转必须遵循：`create -> 获取后端 ID -> navigate`。

## 五、新增 Service 流程

新增领域 service 时，按需补齐：

```text
src/domains/<Domain>/
├── index.ts
├── apis/
├── mapper/
├── entity/
├── enum/
├── mock/
└── service/
```

并更新：

- `src/domains/_registry/registry.types.ts`
- `src/domains/_registry/registry.ts`
- 有新增 API 時，同步更新 `apis.impl.ts` 與 `apis.mock.ts`
- `src/domains/_registry/hooks.ts`
- `src/domains/index.ts`

## 六、检查清单

- [ ] 调用侧通过 `useXxxService()` 获取能力。
- [ ] service 实现导出 `createXxxServices` 工厂。
- [ ] 跨 service 依赖通过 registry 注入。
- [ ] service 不做 UI 提示。
- [ ] service 不直接 import Axios。
- [ ] 字段转换交给 mapper。
- [ ] 错误向上抛出。
- [ ] 未新增 `any`。
