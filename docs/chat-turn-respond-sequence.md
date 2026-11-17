# Chat Turn：respond / recover 时序

> 对应实现：`useChatTurnRuntime.submitToolApprovals`、后端 `POST /chat/completions/respond|recover`  
> 目的：讲清「为什么审批时不能再一律走 recover」。

## 一句话

- **respond**：turn 还在跑、后端在等前端 → JSON 提交结果，**原 SSE 继续**
- **recover**：turn 已挂起（超时等）→ 提交结果并 **新开 SSE**
- **stream**：只订阅已有 turn 的事件，不提交结果

---

## 角色

| 角色 | 是谁 |
|---|---|
| UI | 审批弹窗 / 前端工具执行 |
| Runtime | `useChatTurnRuntime`，组合 Message Pipeline 与领域 Service |
| Chat API | `wisepen-chat-service` |
| Runner | 后端 ReAct 循环（写 Redis Stream） |
| Broker | `FrontendToolResponseBroker`（等前端结果） |

---

## 路径 A：正常审批（当前主路径）

SSE 一直开着；用户点允许/拒绝后只打 respond。

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant UI as 审批弹窗
  participant FE as ChatTurn Runtime
  participant API as Chat API
  participant Runner as Turn Runner
  participant Broker as Response Broker

  User->>FE: 发送消息
  FE->>API: POST /completions (开 SSE)
  API->>Runner: start_turn
  Runner-->>FE: SSE 文本/工具事件…

  Note over Runner,Broker: 需要高危审批或前端工具
  Runner->>Broker: open_wait(expected ids)
  Runner-->>FE: SSE data-tool-approval-request
  FE->>UI: 弹出审批

  Note over Runner,FE: SSE 不断；Runner 阻塞在 receive()

  User->>UI: 允许 / 拒绝
  UI->>FE: submitToolApprovals(approvals)
  FE->>FE: localStream=open/connecting → 选 respond
  FE->>API: POST /completions/respond (JSON)
  API->>Broker: submit(results)
  Broker-->>Runner: future 完成
  Runner-->>FE: SSE 继续（工具结果 / 后续生成）
  Runner-->>FE: SSE finish
```

**前端判定**：`localStream === 'open' | 'connecting'` → 直接 respond，不 `sendMessage`。

---

## 路径 B：页面断流，但 turn 还在等

用户刷新、切页、网络抖一下：前端 SSE 没了，后端 runner + broker 还在。

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant FE as ChatTurn Runtime
  participant API as Chat API
  participant Runner as Turn Runner
  participant Broker as Response Broker

  Note over Runner,Broker: 已 open_wait，正在等审批
  Note over FE: 本地 SSE 已断，localStream=closed/idle

  User->>FE: 重新进入会话 / 点审批
  FE->>API: GET /completions/active
  API-->>FE: turn_id 存在

  FE->>API: POST /completions/respond
  API->>Broker: submit
  Broker-->>Runner: 唤醒，继续生成

  FE->>API: GET /completions/stream?session_id=
  API-->>FE: 重新订阅同一 turn 的 SSE
  Runner-->>FE: 后续事件…
```

**前端判定**：非 live stream，但 `getActiveTurnId()` 有值 → respond + `resumeLocalStream()`。

---

## 路径 C：等待超时 → 挂起 → recover

Broker 超时后 runner 挂起；此时 **没有** active turn，respond 没用，必须 recover 新开一轮。

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant FE as ChatTurn Runtime
  participant API as Chat API
  participant Runner as Turn Runner
  participant Broker as Response Broker
  participant Store as SuspendedChat

  Runner->>Broker: open_wait
  Broker-->>Runner: timeout → null
  Runner->>Store: 持久化挂起上下文
  Runner-->>FE: SSE 结束（若还连着）
  Note over API: active turn 清空

  User->>FE: 补交审批 / 工具结果
  FE->>API: GET /completions/active
  API-->>FE: turn_id = null

  FE->>API: POST /completions/recover (SSE)
  API->>Store: 读挂起上下文 + 合并结果
  API->>Runner: 新 turn 继续
  Runner-->>FE: 新 SSE 事件…
```

**前端判定**：无 active turn → `chat.sendMessage(undefined, { body: recover })` → transport 打到 `/recover`。

---

## 三条 API 对照

```mermaid
flowchart TD
  A[需要提交审批或前端工具结果] --> B{本地 SSE 还活着?}
  B -->|是 open/connecting| C[POST /respond<br/>不断流]
  B -->|否| D{GET /active 有 turn_id?}
  D -->|有| E[POST /respond<br/>再 GET /stream 补订]
  D -->|无| F[POST /recover<br/>新开 SSE]
```

| API | 何时 | 响应 | 会不会新开 turn |
|---|---|---|---|
| `POST /completions/respond` | runner 仍在等 Broker | JSON `R.success` | 否 |
| `GET /completions/stream` | 有 active turn，只重连看流 | SSE | 否 |
| `POST /completions/recover` | 无 active turn，从挂起恢复 | SSE | 是（新 turn） |
| `POST /completions` | 用户发新消息 | SSE | 是 |

---

## 和旧协议差在哪

| | 旧 | 现（已接） |
|---|---|---|
| 要审批/前端工具时 | 后端常先结束 SSE，等前端再 recover | SSE 保持；前端 respond |
| 审批弹窗 | 以前前端会挡 `running` 时点击 | 允许 streaming 时提交 |
| recover | 几乎每次续跑都用 | **仅挂起恢复** |

---

## 代码落点

- 路由逻辑：`src/domains/ChatTurn/runtime/useChatTurnRuntime.ts` → `submitToolApprovals`
- JSON 契约：`RespondChatTurnApi` → `/chat/completions/respond`
- 审批触发：`useChatToolApproval` → `submitToolApprovals`
- 后端等待：`FrontendToolResponseBroker`；接口：`chat/api/endpoints/chat.py`
