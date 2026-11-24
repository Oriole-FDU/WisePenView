# Chat 业务模型

分层准则见 [principle.md](./principle.md)。本文约定用户心智，以及 ChatRouter、SessionCoordinator 与 SessionRuntime 的职责边界。

## 用户心智

在用户看来，能通过 session 历史列表访问到的会话都存在、且彼此等价，可以并发。没有「waiting for respond / killed / need recover」这类后端生命周期话术。

下列事项与用户 / Component 无关，不得泄漏到窄门之外的产品话语：

- redis 是否有缓存、是否要从 mongo 拉历史
- check active / respond / recover 等后端步骤
- 前端池里有几路流、谁在前台谁在后台、流如何转移

本轮不做侧栏徽章、不做非前台 session 的 phase 投影。列表侧若需要运行态，期望将来由 `listSessions` 增加字段提供（前端维护的 runtime 有上限，不能靠池内实例覆盖全部会话）。

## 状态模型

每个已被 Runtime 持有的 session，用两维描述：

- `visibility`：`foreground` | `background`
- `phase`：`idle` | `sending` | `streaming` | `canceling` | `hanged` | `error`

含义：

| phase       | 含义                                   |
| ----------- | -------------------------------------- |
| `idle`      | 可接受新 query                         |
| `sending`   | 已发出 query，尚未进入稳定的流式或终态 |
| `streaming` | 正在接收助手增量                       |
| `canceling` | 已请求取消，等待收敛                   |
| `hanged`    | 等待审批（tool approval）              |
| `error`     | 不可恢复错误（对应该会话当前回合）     |

Foreground 与 background 均可处于上述 phase。Background 下即使后端仍在 streaming，UI **不保证**实时感知；切回 foreground 时由 Runtime bootstrap 对齐。

### 转移

```text
idle --query--> sending --> streaming | hanged | error

streaming --cancel--> canceling --> idle | error
streaming --(后端要求审批)--> hanged

hanged --approve--> streaming

foreground <-> background：保留 phase；仅改 visibility
```

说明：

- `create` 新前台：原 foreground 变 background（phase 不变）；新 session 进入 foreground 且 `idle`（显式新建空白会话时）。
- `f ↔ b` 与 phase 正交，各类 phase 在切换时原样保留。
- `cancel` 只在 `streaming`（及实现上与之等价的在途态）被消费。
- `approve` 之后直接进入 `streaming`，不经额外的用户可见 `sending`。

## React 接入与运行时所有权

`AppLayout` 下的 `ChatRuntimeProvider` 创建并持有唯一的 ChatRouter。Router 内部创建并持有 SessionCoordinator；Coordinator 以闭包创建并保存各 session 的 SessionRuntime。React 组件通过 `useChatRouter` 发出操作，通过 `useChatRouterSnapshot` 订阅当前 Router 快照，不直接创建或持有运行时实例。

```text
AppLayout
└── ChatRuntimeProvider
    └── ChatRouter
        └── SessionCoordinator
            └── session runtimes (closure-owned)
```

## ChatRouter（对话窄门）

ChatRouter 是对话 Component 的唯一交互点。它维护「当前前台」指向，并把前台 SessionRuntime 的可消费面交给 View。

### 给 View 的能力

- **消息与流式投影**：持续更新的 messages（及渲染所需 status）
- **意图**：包括 `send`、`cancel` 和审批响应，均经 Router 收口
- **切会话**：View「索取」某 session 进入前台时，由 Router 完成 `b → f` / `f → b`，并替换当前句柄

React 订阅通过 `useChatRouter` 与 `useChatRouterSnapshot` 完成。View 不直接调用 AI SDK 的发送接口拼接后端请求；发送、取消与审批都由 Router 转发给对应 SessionRuntime。

产品 `phase` 与 AI SDK `status`（`submitted` / `streaming` / `ready` / `error`）可以映射，但对外产品话语以本文 `phase` 为准；`recover` 等词不对 Component 出现。

## SessionCoordinator

Coordinator 管理多路 SessionRuntime 的生命周期，是池的调度器，不是对话消息的窄门。

职责：

- 按需创建 / 取用 runtime
- 前台切换时与 Router 协作（池内命中或冷启动后再交给 Router）
- 池有上限时按 LFU（或同等策略）驱逐
- `cleanup`：销毁前端 runtime 实例

`cleanup` **不等于** `cancel`：不处理后端回合，只清前端实例与订阅。

### create / delete

后端 API 上，创建会话与 completion **可以分离**。时序不能泄漏给 Component。

**delete**

- 删除的是会话持久化数据，与对话 Router 无关。
- 由列表等入口走 Session 类 Service；若池中仍有对应 runtime，通知 Coordinator 做 `cleanup`。

**create 与 send**

对 Component 只暴露一次 `send`。时序收口在 Router / Coordinator：

1. **Lazy create（首发）**：无 session 时，一次 `send` 可先 create，成功并写入前台身份后，同一意图进入 `sending` → 后续 phase。失败则对 View 表现为这次 send 失败，不露出半截 create。
2. **显式 create**：Coordinator 创建空白会话并成为 foreground `idle`；之后的 `send` 不再 create。

Component 不编排 `ensureSession` 再 `completion`。

## SessionRuntime

Runtime 把后端生命周期收成前端产品态。对内可有 bootstrap；对外在 bootstrap 结束后只呈现：

`idle` | `streaming` | `hanged` | `error`  
（在途还有 `sending` / `canceling`，见上表。）

### Bootstrap（内部）

冷启动分两种，由 `SessionBootstrapKind` 固化：

- `createSession`：新建空白会话，不拉历史、不续流，直接 `idle` + ready
- `loadSession`：已有会话进入池内

```text
loadSession:
load history
    │
    ▼
对齐活跃回合（若有）
    │
    ├── 进入 streaming（含续流）
    └── 或 idle / hanged / error
```

`check active`、reconnect、recover、从哪类存储拉数，都是 `loadSession` 内部步骤，对 Component 不可见。Bootstrap 结束后会话处于上表产品态之一。

之后：

- `streaming` 随数据流自然进入 `hanged` / `error` / `idle`
- `cancel`：`streaming → canceling → idle | error`
- `idle` 上 `query`（经 Router send）：进入 `sending`，再进入后续 phase

被 Coordinator 驱逐的 runtime 走 `cleanup`，不自动 `cancel` 后端。

## 工具审批

活跃 SessionRuntime 收到工具审批决定时调用 `respondTurn`；处于 `hanged` 的 session 则通过 SSE recovery 发送审批决定并恢复后续流。审批 UI 只表达用户决定，不负责选择底层 API 或编排恢复时序。

## 本轮明确不做

- 侧栏 / 列表上的运行态徽章
- Component 读取非前台 session 的 phase 或消息投影
- 池容量具体数字与 LFU 参数
