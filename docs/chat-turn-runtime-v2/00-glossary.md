# 名词表与边界

> 用途：对齐会议的词汇表。
> 标记：`[已决]` · `[沿用]` · `[拟定]`（仍可微调） · `[废弃意图]`

---

## 1. 核心对象

| 名词                                   | 标记     | 定义                                                                                                     | 不包含                                            |
| -------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Session**                            | `[沿用]` | 后端会话身份，前端以 `sessionId: string` 标识                                                            | 路由 locationKey、面板 UI 状态                    |
| **Runtime** / **ChatTurnRuntime**      | `[已决]` | **绑定单一固定 `sessionId`** 的对话运行时实例：持有消息泵、连接相位、历史加载、审批提交入口              | 多 session 切换、路由、登录门禁                   |
| **Runtime Instance**                   | `[已决]` | 与 Runtime 同义：Router Map 里的那个活对象                                                               | 只读投影（那是 View）                             |
| **Router** / **ChatTurnRuntimeRouter** | `[已决]` | 标签页内单例：`Map<sessionId, Runtime>`、`activeSessionId`、缓存上限与 focus / dispose                   | 发 HTTP、解析 SSE、拼装 Chat 发送载荷             |
| **Pump** / **PumpChatTransport**       | `[沿用]` | 把已取得的 SSE `Response.body` 装配进 AI SDK `ChatTransport` 的适配器（**按次 arm，非跨 session 切换**） | 发起 `/completions` 等请求                        |
| **Chat（AI SDK）**                     | `[沿用]` | `@ai-sdk/react` 的 `Chat` 实例；消息列表与 `status` 的权威源之一                                         | ChatTurn 的 connect FSM                           |
| **Active Session**                     | `[已决]` | Router 当前 focus、供 UI 消费的唯一 `sessionId`                                                          | 「仅它能有 SSE」——**否**；后台 Runtime 可持续拉流 |
| **Active Turn**                        | `[沿用]` | 后端 `GET /completions/active` 返回的进行中 turn；与「哪个 session 在前台」解耦                          | Router 的 activeSessionId                         |
| **Fake Runtime**                       | `[拟定]` | 阶段 2 测试替身，实现 Router 所需端口，不含真 SSE                                                        | 生产路径                                          |

---

## 2. 生命周期与动作

| 名词                                         | 标记     | 定义                                                                                                                                        |
| -------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lifecycle Phase**                          | `[拟定]` | Runtime 阶段：`created` → `bootstrapping` → `ready` → `disposing` → `disposed`（失败见下）                                                  |
| **Connect Phase**                            | `[沿用]` | 本地流连接相位：`idle` / `connecting` / `open` / `closed`                                                                                   |
| **Bootstrap**                                | `[已决]` | 进入可用前：按需加载历史，再按需接上 active turn 的流；**失败则报错并 dispose 清理干净**（不留半残实例）                                    |
| **Focus**                                    | `[已决]` | 将某 `sessionId` 设为 Active Session（UI 指向它）；必要时 create + bootstrap。**不**因失焦而停旧 Runtime 的泵                               |
| **Background**                               | `[已决]` | 非 active、但仍在 Router 缓存中的 Runtime；**继续拉流，messages 继续增长**。前台/后台展示态后续由 session history 栏维护，本改造不实现该 UI |
| **Dispose / Unload**                         | `[已决]` | 从 Router 移除并销毁 Runtime（停泵、释资源）；超限或登出时使用。不用 evict / kill 作正式名                                                  |
| **Resume**                                   | `[沿用]` | 查询 active turn；有则 reconnect SSE 并 `pumpResume`。主要用于 **新建实例 bootstrap**；缓存命中且一直在拉时，focus **不必**再 resume 补历史 |
| **Respond** / **Recover** / **Continuation** | `[沿用]` | 见 [respond 时序](../chat-turn-respond-sequence.md)                                                                                         |

---

## 3. 资源与策略（已决方向）

| 名词                | 标记     | 定义                                                                                |
| ------------------- | -------- | ----------------------------------------------------------------------------------- |
| **Live SSE Budget** | `[已决]` | 后台可持续拉流 ⇒ 同时可有多路 SSE；用 **缓存个数** 卡资源，不靠「失焦断流」         |
| **Runtime Cache**   | `[已决]` | Router 中未 dispose 的 Runtime（含 active + background）                            |
| **Cache Limit**     | `[已决]` | `MAX_CACHED_RUNTIMES` 取 **3–5**（含 active）；超出则对非 active 做 LRU **dispose** |
| **LRU**             | `[已决]` | 超限时优先 dispose 最久未 focus 的非 active；不可 dispose 当前 active               |

---

## 4. 消费面

| 名词                  | 标记     | 定义                                                                                                                                 |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Consumer Hook**     | `[已决]` | `useChatTurn`：按 route `focus(sessionId)`，订阅 Active 的 View（对外不叫 Runtime）                                                  |
| **Runtime View**      | `[已决]` | Runtime 的只读投影（原称 Snapshot）：供 React 订阅的 status/connect/history/approval 等；**≠ Instance**                              |
| **Send 路径**         | `[已决]` | 发送交给 Router（或经 Hook 落到 active Runtime）；Router **只向当前 focus 的实例**发。不存在「options.sessionId 写到另一个 Runtime」 |
| **Shell / Chat 壳层** | `[沿用]` | 登录、ensureSession、资源门禁、载荷拼装；不拥有 Runtime 生命周期                                                                     |

### Runtime 内子系统（已决命名）

不叫 Controller。沿用目录语义：

| 模块       | 职责                                   |
| ---------- | -------------------------------------- |
| `connect`  | 相位、send/cancel/resume、continuation |
| `history`  | bootstrap 历史、loadMore               |
| `message`  | `Chat` + `PumpChatTransport`           |
| `approval` | 待审批派生与提交入口                   |

---

## 5. 易混概念

```text
route.sessionId ──focus──► Router.activeSessionId ──UI──► Runtime View
                              │
                              ├── Map: 最多 3–5 个 Runtime Instance
                              └── 每个 Instance 可各自持有 live SSE（后台不停泵）

后端 active turn ◄── 各 Runtime 自己的 resume / continuation
```

| 说法                          | 正确归属                                                |
| ----------------------------- | ------------------------------------------------------- |
| 「切换会话要清 runtime」      | **错误** → 只改 active 指针；旧实例进 background 继续拉 |
| 「失焦必须停泵」              | **错误（已否决）** → 后台持续拉流                       |
| 「一个 runtime 换 sessionId」 | **禁止**                                                |
| 「pump 跟着 session 切换」    | **禁止** → 一 Instance 一 Pump                          |
| 「切走会话等于 cancel」       | **否** → 只有显式 cancel 或 dispose                     |

---

## 6. 目录与符号（已决）

| 路径 / 符号                     | 含义                                      |
| ------------------------------- | ----------------------------------------- |
| `runtime/`                      | 现行实现根目录                            |
| `runtime/chatTurnRuntime.ts`    | 单 session 实例（类名 `ChatTurnRuntime`） |
| `runtime/router/`               | Router 单例                               |
| `runtime/react/useChatTurn.ts`  | Consumer Hook                             |
| `ChatTurnRuntimePort`（或等价） | Router 依赖的 Runtime 端口                |

---

## 7. 已落地变更（相对旧 hook runtime）

| 旧概念                                                        | 现行                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------- |
| `useChatTurn`（旧名 `useChatRuntime`）随 `sessionId` teardown | Router focus；失焦不停泵                                |
| 跨 session 的 `latestSessionId` 陈旧防护                      | 单 Instance 内不再需要                                  |
| 组件匿名 `useChat`                                            | Runtime 持有的 `Chat`                                   |
| 正式用语 evict / Snapshot / Controller                        | dispose、Runtime View、connect/history/message/approval |
| 目录名 `runtimeV2/`                                           | 已并回 `runtime/`                                       |
