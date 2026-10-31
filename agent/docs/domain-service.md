# Domain Service 规范

Service 层位于 `src/domains/<Domain>/service`，负责业务编排和错误抛出。它是 view/component 获取领域能力的主要入口。

## Domain 粒度

Domain 不是越细越好。拆分依据是独立业务能力、生命周期和变化原因，不是 endpoint 数量或目录对称。

- 最低粒度应是一组完整 CRUD、命令／查询能力，或等价的内聚状态生命周期。
- 单一查询、单一提交、纯 DTO 转换和转发 wrapper 默认留在父域，等能力成长为稳定边界后再拆。
- 只有多个接口但共享同一父域生命周期时，也优先保留在同一 domain 内，通过模块或 service 方法隔离。
- `Feedback`、`UserInvite` 这类单接口能力不应单独成域；`UserVerification`、`UserTask`、`UserTour` 有独立状态与生命周期，可以保留边界。

## 一、职责

Service 应负责：

- 编排一个或多个 API 调用。
- 在 API 契约与业务语义不一致时调用 mapper 完成转换；语义一致时直接使用已校验的 API 数据。
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

正式与 mock 共用 `src/domains/_registry/registry.ts` 的 service 装配。跨 service 依赖必须由工厂参数注入。

Service 通过 `@domain-apis` 调用 API；Vite mock 模式与 Storybook 选择 `apis.mock.ts`，其他模式选择 `apis.impl.ts`。mock 只模拟 API 响应与外部 I/O，不另写 service、mapper 或前端缓存。

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
- Domain Service 只创建或抛出错误，不负责遥测。仅在 View/Controller、SDK callback 或批量结果层
  已经消费故障、且该故障需要排查时调用 `captureException`，并显式提供 operation。
- `createClientError` 不会自动上报；请求层已记录的最终请求失败不会在业务 catch 中重复上报。

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
├── mapper/（按需）
├── entity/
├── enum/
├── mock/
└── service/
```

并更新：

- `src/domains/_registry/registry.types.ts`
- `src/domains/_registry/registry.ts`
- 有新增 API 时，同步更新 `apis.impl.ts` 与 `apis.mock.ts`
- `src/domains/_registry/_context/useServices.ts`
- `src/domains/index.ts`

## 六、检查清单

- [ ] 调用侧通过 `useXxxService()` 获取能力。
- [ ] service 实现导出 `createXxxServices` 工厂。
- [ ] 跨 service 依赖通过 registry 注入。
- [ ] service 不做 UI 提示。
- [ ] service 不直接 import Axios。
- [ ] 没有为字段同名且语义一致的请求或响应保留机械 mapper。
- [ ] 错误向上抛出。
- [ ] 未新增 `any`。
