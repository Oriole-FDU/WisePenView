# 服务端查询、分页与结果状态契约

本文规定如何发起服务端读取、划分结果状态，以及在查询条件变化后处理旧数据。错误值、上报和提示继续遵循 [error.md](error.md)。

## 1. 设计原则

1. **三个读取入口**：从 `@/hooks/useApi` 导入 `useApi`、`useApiPagination`、`useApiInfiniteScroll`，分别负责普通查询、页码分页和顺序追加。Service 只返回领域结果，不管理 React 状态。
2. **条件决定归属**：资源 ID、集合 ID、排序、筛选词、账号等影响结果的条件进入 `queryKey`。不要用清空 effect、列表长度或条目携带的临时 query 字段纠正数据归属。
3. **失败不等于空**：`state.status === 'empty'` 只能来自成功结果；未开始、首次加载、刷新、追加和失败各有独立状态。`data ?? []` 可以用于映射条目，不能作为请求成功或空结果的证据。
4. **入口管理读取机制**：取消旧请求、结果隔离、翻页、末页和按标识去重集中维护；页面提供查询函数、参数和条目标识。点赞计数、树形展开、外部注入条目与消息合并继续由领域或消费端负责。
5. **空值由业务定义**：数组默认按长度判断；带 `queryKey` 的对象结果必须显式提供 `isEmpty` selector。入口不猜测 `items`、`records`、`balance` 等字段的业务含义。
6. **按职责限制 hook**：只限制服务端请求原语，不禁止其它 ahooks 能力。本地代码高亮和 Mermaid 渲染仍使用适合本地任务的 `useRequest`。

## 2. 入口与结果契约

实现位于 `src/hooks/query/`，公共入口始终是 `src/hooks/useApi.ts`。不建立第二套查询 wrapper 或共享全局缓存。

| 入口                                     | 输入                                                                                      | 结果                                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `useApi(service, options)`               | 普通读取；手动命令使用 `manual: true`                                                     | `state`、`data`、`run/runAsync`、`refresh/refreshAsync`、`mutate`、`cancel`                 |
| `useApiPagination(service, options)`     | 必填 `queryKey`；service 接收 `{ current, pageSize }`，返回 `{ list, total }`             | 普通结果与 `pagination`                                                                     |
| `useApiInfiniteScroll(service, options)` | 必填 `queryKey`、`pageSize`、`getKey`；页码模式接收 `{ page, size }`                      | 聚合的 `data`、`state`、`hasMore`、`loadMore/loadMoreAsync`、`reload/reloadAsync`、`mutate` |
| 同一追加入口的游标模式                   | `pagination: 'cursor'`、`initialCursor`、`getNextCursor`；service 接收 `{ cursor, size }` | 同上；只有 `null` 表示结束，`0` 和空字符串是有效游标                                        |

`queryKey` 是仅包含 `string / number / boolean / null / undefined` 的数组，按值比较，`undefined` 与 `null` 不同。不要放函数、service 实例或可变对象；参数应展开为确定的原始值。

固定且无参数的普通查询可以省略 key；带可变参数的读取必须声明 key。旧普通查询还存在只使用 `refreshDeps` 的写法，按领域继续迁移；本轮没有声称全量审计所有普通读取。`refreshDeps` 表示**同一查询失效后刷新**，不代替查询身份。

### 结果状态

`state` 是可辨识联合；在 `error` 分支中 `error` 必定存在，在成功分支中 `data` 必定存在。不要另造 `loaded / hasError / empty` 同义状态。

| `state.status` | 语义                                         | 数据                               |
| -------------- | -------------------------------------------- | ---------------------------------- |
| `idle`         | 手动读取尚未开始，或 `ready: false` 尚无结果 | 无                                 |
| `loading`      | 当前查询首次加载                             | 默认无数据                         |
| `refreshing`   | 同 key 重新读取                              | 保留上次成功结果                   |
| `loadingMore`  | 获取下一页或下一游标                         | 保留已经成功追加的数据             |
| `empty`        | 成功，且 selector 判定为空                   | 有成功结果                         |
| `success`      | 成功，且 selector 判定非空                   | 有成功结果                         |
| `error`        | 最近一次读取失败                             | 有可消费的错误；可能有上次成功结果 |

顶层 `loading / loadingMore / error / data` 用于现有表格、按钮和虚拟列表适配。它们由同一个结果派生，不能组合成另一份请求状态机。消费端优先读取 `state`。

### 重置、刷新、追加与取消

- key 改变：立即隐藏旧结果，取消旧请求的状态更新；旧响应不能更新新查询或触发其成功／错误回调。
- `ready: false`：不自动发起读取，并取消正在进行的读取；已有同 key 数据仍可保留。恢复为 `true` 时重新读取。
- 普通查询和页码查询默认不跨 key 保留数据；显式 `keepPreviousData: true` 才保留，并通过 `isPreviousData` 标识。新 key 的状态仍为 `loading`，其 `state.data` 可携带旧结果；展示时应表达正在读取新条件。
- 页码查询：key 改变回到第 1 页；页大小变化回到第 1 页。再次选择当前页会刷新该页，可供充值／编辑后更新使用。
- 追加查询：key 改变清空累计数据；`reload` 从首段替换列表，成功前保留同 key 旧列表。刷新失败不清空成功数据。
- 页码追加从 1 开始，以上一次**成功请求的页码**递增，不能根据去重后条目数量反推。`totalPage` 存在时使用它，否则按 `total / pageSize` 计算末页；成功返回空页也会停止追加。
- 游标追加严格使用 `getNextCursor`；失败保留原游标，重试同一段。
- 追加入口的 `onSuccess` 接收本次服务端返回的原始页；`data` 是去重后的累计列表，不能混用两者。
- `getKey` 必须稳定且唯一：跨页重复条目保持首次位置，使用后到达的内容。分页总量与业务合并不根据去重后的条目数量改写。
- `retry` 重试最近失败的读取：首段／刷新失败重新读取首段，追加失败重试原页／原游标。
- 并发重复 `loadMore` 被忽略；追加失败保留原数据与进度。错误后停止自动滚动追加，由用户重试；不得自动循环重试错误。
- 提供 `target` 时，滚动接近底部或成功后内容尚未填满容器会继续追加。
- `mutate` 只更新当前查询的展示数据，不推进页码或游标。不要用 `mutate(undefined)` 实现 key 切换。
- 取消沿用 ahooks 的逻辑取消语义：阻止结果与回调提交，不承诺中断 transport；被取消的 `runAsync` 可能不继续兑现，不把它作为必须执行的 cleanup 入口。

### 错误消费

三个入口都统一 `createError`、`reportError`，并保留 401 已处理／过期会话的静默约定。`showErrorToast: false` 只关闭 toast，不删除错误状态或遥测。业务回调遵循 [error.md](error.md)，不要再次展示相同错误。

首次失败：展示错误与重试入口。刷新／追加失败：展示错误并保留已有内容；重试追加调用 `loadMore`，重试首段或刷新调用 `reload`／`refresh`。禁止同时展示成功为空的文案。

## 3. 代码范例

### 普通对象读取：明确空值语义

```ts
const profile = useApi(() => userService.getUserInfo(), {
  queryKey: ['user-profile', userId],
  isEmpty: (user) => user === null,
});

if (profile.state.status === 'error') {
  return <ErrorState title={parseErrorMessage(profile.state.error)} />;
}
if (profile.state.status === 'loading') return <Spin />;
if (profile.state.status === 'empty') return <EmptyState title="暂无用户资料" />;
```

对象型 payload 没有空语义时显式写 `isEmpty: () => false`。余额为 0 仍是成功结果，不是空结果。

### 页码分页：条件与当前页由入口维护

```ts
const transactions = useApiPagination(
  async ({ current, pageSize }) => {
    const result = await walletService.listTransactions({
      groupId,
      page: current,
      size: pageSize,
      transactionTypes,
    });
    return { list: result.records, total: result.total };
  },
  {
    queryKey: ['wallet-transactions', groupId, transactionType],
    defaultPageSize: 20,
  }
);

// 改变筛选条件即可，不再额外清空列表或命令式切回第一页。
setTransactionType(nextType);
```

### 页码追加：页面只提供查询与标识

```ts
const comments = useApiInfiniteScroll(
  async ({ page, size }) => {
    const result = await commentService.listComments({ resourceId, sortBy, page, size });
    return { ...result, list: result.items };
  },
  {
    queryKey: ['resource-comments', resourceId, sortBy],
    pageSize: 10,
    getKey: (comment) => comment.commentId,
  }
);

const items = comments.data?.list ?? []; // 仅映射条目；是否为空仍看 state。
// 错误提示与已有列表并列呈现，不因追加失败隐藏已经读取的条目。
const errorMessage =
  comments.state.status === 'error' ? parseErrorMessage(comments.state.error) : undefined;
const showEmpty = comments.state.status === 'empty';
```

### 游标追加：消费真实后端游标

```ts
const events = useApiInfiniteScroll(
  ({ cursor, size }) => eventService.listEvents({ after: cursor, size }),
  {
    queryKey: ['events', projectId],
    pagination: 'cursor',
    initialCursor: '',
    pageSize: 20,
    getKey: (event) => event.id,
    getNextCursor: (page) => page.nextCursor,
  }
);
```

示例中的 service 名称说明参数形态，不新增或猜测现有后端游标接口。现有接口返回 `items / messages / records` 时，在查询函数中显式映射为 `list`。

## 4. 自动约束与迁移边界

`lint/query.js` 的 `wisepen/no-direct-server-query` 作为 error 接入 `pnpm lint`，也可用 `pnpm lint:query` 单独检查。规则由 `lint/contracts.js` 登记，复用 [契约 lint 基础设施](lint.md) 的注册、诊断筛选与退出码，不维护查询专题的独立扫描脚本。

- `src/hooks/query/` 是请求原语实现目录；公共消费统一从 `@/hooks/useApi` 导入。
- 其余 `src` 代码不得直接导入或访问 ahooks 的 `usePagination / useInfiniteScroll / useRequest`。检查命名、别名、深路径、namespace 访问、解构与直接再导出；类型导入允许。
- 本地任务按职责登记允许目录：`base/Markdown/CodeBlock`、`base/Markdown/MermaidBlock`、编辑器 `MermaidPlugin/MermaidBlock`。只允许 `useRequest`，同文件直接导入 Domain／API 时取消此例外。
- 其它本地异步任务应按实际职责审查后登记目录，不通过任意注释或 eslint-disable 放行服务端请求。
- 不限制 `useLatest / useUnmount / useEventListener` 等无关能力，不做全仓 ahooks 禁用。
- lint 不推断 service 方法名、业务空值、是否正确选择 query key 或 selector；这些由类型、契约和 Review 负责。业务封装必须把 `state` 一路传到消费端。

本轮迁移覆盖收藏资源／集合、评论／回复、聊天会话栏／侧栏、Agent 选择、钱包交易、成员分页、通知与命令面板搜索。删除这些调用旁的页码反算、末页判断、清空 effect 与同义加载状态。保留评论点赞、Agent 注入和侧栏会话 store 等领域语义；树形分页等领域状态机不因同样读取服务端就机械替换。
