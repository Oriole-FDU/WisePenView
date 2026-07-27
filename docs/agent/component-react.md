# React、Hooks 与 TypeScript 规范

本规范用于所有 React 组件、页面、Hooks 和相关 TypeScript 代码。

## 一、通用编码

- 不要在函数组件中使用 `this`。
- 所有函数组件必须返回有效 React 节点，例如 JSX、`null`、字符串。
- 组件定义名使用大驼峰。
- 组件实例变量、Props、普通变量使用小驼峰。
- Refs 使用 `React.createRef()`、`useRef()` 或回调 ref，禁止字符串 ref。
- 事件处理函数以 `handle` 或 `on` 开头，例如 `handleSubmit`、`onClick`。

## 二、Hooks

- 只在最顶层调用 Hooks，不在循环、条件判断或嵌套函数中调用。
- 只在 React 函数组件或自定义 Hooks 中调用 Hooks。
- 自定义 Hook 必须以 `use` 开头，并采用小驼峰，例如 `useFetchData`。
- 依赖数组必须精确。若确实不能包含某依赖，必须用中文注释解释原因。
- 不要用 `useEffect` 计算派生状态，能在渲染时计算就直接计算。

## 三、副作用治理

项目默认禁止直接使用 `useEffect` 组织业务逻辑。

优先方案：

- 用户操作触发的逻辑，写在事件处理函数中。
- 请求副作用使用 `ahooks` 的 `useRequest`。
- 生命周期语义使用 `useMount`、`useUnmount` 或已有领域 Hook。
- 订阅、长连接、协同会话等复杂逻辑优先封装为领域 Hook。

必须使用 effect 时：

- 直接使用 React `useEffect`，不使用 wrapper 或 alias 绕过 React Hooks 检查。
- `useEffect` 上方必须写 JSDoc 风格中文注释。
- 注释必须包含 `@wisepen-manual-effect` 标记，并说明执行时机、为什么不能用事件驱动或状态派生实现、cleanup 的作用。该标记只放行本项目的 effect 治理规则，不是通用 `eslint-disable`。
- 禁止使用 `useUpdateEffect` 规避首次执行；它仍是 effect，不能解决错误的数据流设计。

## 四、useMemo 与 useCallback

业务代码默认禁止 `useMemo` 和 `useCallback`，ESLint 会同时拦截命名导入和
`React.useMemo` / `React.useCallback` 属性调用。React 函数组件应先保证没有缓存也能正确工作。

确有必要时直接使用 React `useMemo` 或 `useCallback`，但标准 manual JSDoc 只负责审批和说明，不豁免 React Hooks 规则。

只有以下情况才允许使用 `useMemo` 或 `useCallback`：

- React Profiler 或可重复基准明确证明计算或子树重渲染构成实际性能瓶颈。
- 第三方命令式 API 明确把引用身份作为注册、取消注册或资源生命周期契约。
- 缓存值是其它已批准 memoization 的必要依赖，且无法通过移动对象创建位置消除。

例外要求：

- 每个调用点上方必须紧邻中文 JSDoc，并包含 `@wisepen-manual-memo` 标记，以及“为什么：”“收益：”“失效条件：”三项说明。该标记只放行本项目的 memo 治理规则，不是通用 `eslint-disable`。
- `useMemo` / `useCallback` 只是性能优化，删除后行为必须保持正确。
- `useMemoizedFn` 只用于“稳定函数身份 + 始终读取最新闭包”的真实命令式契约，不得替代普通事件函数。

不要缓存：

- 简单运算，例如 `a + b`。
- 每次渲染都会因为不稳定依赖而变化的函数。
- 只是为了“看起来性能更好”的普通 JSX 片段或 context value。

## 五、JSX

- 列表渲染必须使用稳定且唯一的 key，优先使用数据中的 id。
- 禁止用数组索引作为 key，除非列表完全静态且不会增删、排序。
- 避免在 JSX 中写复杂逻辑，复杂条件、循环、数组操作抽到组件外函数或局部变量。
- 避免 `{count && <Component />}` 这类可能渲染 `0` 的写法，使用 `{count ? <Component /> : null}`。
- 不要在组件内部定义其它组件。
- 避免超过两层的三元表达式嵌套，优先早期 return 或拆变量。
- 避免非必要内联样式对象。

## 六、状态与不可变性

- 永远不要直接修改 state。
- 新状态依赖旧状态时，使用函数式更新，例如 `setCount((count) => count + 1)`。
- 不要存储可以由 props 或其它 state 计算得到的冗余状态。
- 全局或跨组件 UI 状态优先使用项目已有 zustand store。
- 局部简单状态使用 `useState`。

## 七、TypeScript

- 禁止新增 `any`。
- 优先使用类型推断，避免过度复杂的自定义类型。
- 公共 Props 使用 `{ComponentName}Props` 命名。
- Ref 类型使用 `{ComponentName}Ref` 命名。
- 与第三方库交互且类型无法推断时，把不确定类型限制在最小范围，并尽快转换成项目内稳定类型。

## 八、注释

只在必要时写中文注释：

- 关键业务逻辑。
- 复杂计算公式、权限判断、状态转换。
- 非显而易见的兼容逻辑或 hack。
- 必须违反常规规则的地方。
- 对外公共函数或组件的 JSDoc。

不要为每行代码写注释，不要用注释解释显而易见的“做什么”，优先解释“为什么这样做”。

## 九、Refs 与组件边界

### `useRef` 的合理场景

`useRef` 用于保存“不参与渲染、但需要跨渲染保持身份或可变值”的对象，例如：

- DOM 节点：聚焦输入框、测量尺寸、滚动到指定位置。
- 第三方实例：编辑器、PDF Viewer、图表或拖拽实例。
- 生命周期资源：定时器、`requestAnimationFrame`、订阅取消函数。
- 异步竞态标记：记录请求序号、最新任务 ID 或是否仍然有效。

这些场景中，组件内部读取 `ref.current` 来完成明确的实例操作；如果 ref 只是为了让父组件调用普通业务函数，通常说明组件边界设计不合适。

### 父子通信与 imperative interface

- 父组件要告诉子组件“数据或条件变了”，优先通过 props、状态或递增版本号表达。子组件根据声明式输入请求或计算，不要通过 `ref.refresh()` 传递普通业务事件。
- `useImperativeHandle` 只用于真实的实例命令，例如 `focus()`、`scrollToSelection()`、`openFindBar()`。暴露的 interface 应描述稳定、少量、可验证的实例能力，不应泄漏子组件内部请求和状态实现。
- 当一个 interface 只有单个 `refresh()`、`reload()` 或类似方法时，先检查它是否应该改成 `refreshVersion`、查询参数或显式事件回调；迁移完成后删除旧 ref、旧类型和中间 wrapper，不保留双路径。
- 第三方组件优先使用其官方 ref/interface 类型。不要通过自定义近似类型或 `RefObject<never>` 强转绕过检查；如果官方类型暴露了异步任务、事件字段或权限结构，应按真实契约调用。
- 每个 ref 都要有实际读取点和明确生命周期。只声明、只透传、从未读取的 ref 是死代码，应在审查或迁移时删除。

### 可读性判断

遇到下面这种链路时应优先重构：

```text
store/version -> 父组件 effect -> 子组件 ref -> 子组件内部请求
```

如果业务含义只是“外部数据变更后重新加载”，应收敛为：

```text
store/version -> 子组件声明式输入 -> 子组件请求
```

只有需要控制具体 UI 或第三方实例时，才保留 imperative ref。这样可以减少隐藏调用链、重复的 previous-ref 守卫和仅为暴露方法而存在的 interface。

## 十、检查清单

- [ ] Hooks 调用位置合法。
- [ ] 没有未经审批或可由事件、派生状态替代的 `useEffect`。
- [ ] 必要副作用使用 `useEffect`，并写清带 `@wisepen-manual-effect` 标记的 JSDoc。
- [ ] 没有 `useUpdateEffect`。
- [ ] 没有未经审批的 `useMemo` / `useCallback`；获批例外有带标记的 why 注释，且 React Hooks 检查通过。
- [ ] JSX key 稳定唯一。
- [ ] state 更新保持不可变。
- [ ] 未新增 `any`。
