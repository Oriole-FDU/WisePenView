# ChatTurn 领域业务知识

> Canonical owner：`src/domains/ChatTurn`

## 范围

本文件拥有单轮流式对话的协议、消息、历史、连接、审批与前端运行时边界。会话身份、标题和附件上传归 [ChatSession](../ChatSession/BUSINESS.md)；模型、Provider、Tool 与输入能力归 [ChatConfig](../ChatConfig/BUSINESS.md)；用户输入和页面门禁归 [Chat workflow](../../components/business/Chat/BUSINESS.md)。

多 session Runtime 设计与名词见 [chat-turn-runtime-v2 docs](../../../docs/chat-turn-runtime-v2/README.md)（目录名保留历史；实现已落在 `runtime/`）。协议选路见 [respond / recover 时序](../../../docs/chat-turn-respond-sequence.md)。

## 模块边界

| 模块                 | 负责                                                                   | 不负责                         |
| -------------------- | ---------------------------------------------------------------------- | ------------------------------ |
| API / Service        | checked 协议、DTO mapper、SSE 事件归一化、active turn 与历史读取       | React 状态、UI toast、连接相位 |
| `runtime` 单 Runtime | 固定 `sessionId` 的 Chat + Pump、connect、history、approval、lifecycle | session 路由、多实例调度       |
| `runtime/router`     | Map 缓存、唯一 focus、上限 dispose、登出 clear                         | 发 HTTP、拼装发送载荷          |
| `runtime/react`      | `useChatRuntime`：focus + 订阅 Runtime View                            | 登录门禁、ensureSession        |

数据流：

```text
Chat -> useChatRuntime
  -> chatTurnRuntimeRouter.focus(sessionId)
  -> ChatTurnRuntime
       -> connect -> ChatTurnService -> checked API / SSE
       -> message(Chat + PumpChatTransport) -> messages/status
       -> history -> message.setMessages
       -> approval -> connect.submitToolApprovals
```

## 发送与恢复

1. `send` 创建本次操作的 `AbortController`，先取得 SSE `Response`，确认操作仍是当前操作后才标记连接 open，并把响应体泵入消息运行时。
2. 历史加载成功后再查询并恢复 active turn；同一 Runtime 内并发 resume 共用一个 Promise。
3. 用户取消先停止本地连接，再请求后端 cancel。切换会话只改 Router active；后台 Runtime **继续拉流**，默认不调用后端 cancel。
4. 超限或登出时 Router dispose Runtime（停泵、释资源）；dispose 不能替代用户显式 cancel。

## 工具审批

审批请求来自消息中的 `approval-requested` tool part。同一批请求全部有决定后，按当前本地连接状态选择：

| 本地连接          | active turn | 动作                  |
| ----------------- | ----------- | --------------------- |
| open / connecting | 不额外查询  | respond               |
| 非 live           | 有          | respond，然后 resume  |
| 非 live           | 无          | recover，并泵入新 SSE |

提交失败会重新暴露待审批项并沿 `onError` 反馈；当前没有持久化审批提交的 exactly-once 保证。

## 状态与失败边界

- Runtime lifecycle：`created` → `bootstrapping` → `ready` → `disposing` → `disposed`。bootstrap 失败则报错并 dispose，不留半残实例。
- 连接相位为 `idle / connecting / open / closed`。
- 历史 `replace` 与 `prepend` 共用加载 FSM；版本号用于阻止 dispose 后的迟到写入。
- Router 默认最多缓存 5 个 Runtime（含 active）；后台可持续持有 SSE。
- `Chat` 的 `ChatStatus` 仍是消息流和 UI busy 的事实来源。

## 关键实现

- [ChatTurn service](service/ChatTurnServices.impl.ts)
- [SSE normalizer](service/chatSseNormalizer.ts)
- [ChatTurnRuntime](runtime/chatTurnRuntime.ts)
- [Router](runtime/router/chatTurnRuntimeRouter.ts)
- [useChatRuntime](runtime/react/useChatRuntime.ts)
