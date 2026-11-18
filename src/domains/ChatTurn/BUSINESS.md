# ChatTurn 领域业务知识

> Canonical owner：`src/domains/ChatTurn`

## 范围

本文件拥有单轮流式对话的协议、消息、历史、连接、审批与前端运行时边界。会话身份、标题和附件上传归 [ChatSession](../ChatSession/BUSINESS.md)；模型、Provider、Tool 与输入能力归 [ChatConfig](../ChatConfig/BUSINESS.md)；用户输入和页面门禁归 [Chat workflow](../../components/business/Chat/BUSINESS.md)。

## 模块边界

| 模块               | 负责                                                                | 不负责                           |
| ------------------ | ------------------------------------------------------------------- | -------------------------------- |
| API / Service      | checked 协议、DTO mapper、SSE 事件归一化、active turn 与历史读取    | React 状态、UI toast、连接相位   |
| `runtime/message`  | 唯一 `useChat` 实例、消息权威源、把已取得的 SSE `Response` 泵入 SDK | 发起 HTTP、选择审批协议          |
| `runtime/history`  | 当前 session 的历史分页、加载相位、陈旧响应防护                     | session 路由、后台 turn 生命周期 |
| `runtime/connect`  | send、cancel、resume、审批续跑选路与本地连接                        | 会话创建、资源上下文、模型选择   |
| `runtime/approval` | 从消息派生待审批项、收集决定并触发提交                              | respond / recover 细节           |
| `useChatRuntime`   | 组合上述能力，形成组件唯一消费入口                                  | 内联协议或业务选路               |

数据流：

```text
Chat -> useChatRuntime
  -> connect -> ChatTurnService -> checked API / SSE
  -> message(useChat + PumpChatTransport) -> messages/status
  -> history -> message.setMessages
  -> approval -> connect.submitToolApprovals
```

## 发送与恢复

1. `send` 创建本次操作的 `AbortController`，先取得 SSE `Response`，确认操作仍是当前操作后才标记连接 open，并把响应体泵入消息运行时。
2. 历史加载成功后再查询并恢复 active turn；同一 session 的并发 resume 共用一个 Promise。session 或 epoch 变化的迟到结果不会写入新会话。
3. 用户取消先停止本地连接，再请求后端 cancel。切换会话只停止本地连接；后台 turn 可在后续页面通过 active turn / reconnect 恢复。
4. 页面卸载或 session 切换会中止当前 send / resume、停止消息泵并清零连接相位；它不能替代后端 cancel。

## 工具审批

审批请求来自消息中的 `approval-requested` tool part。同一批请求全部有决定后，按当前本地连接状态选择：

| 本地连接          | active turn | 动作                  |
| ----------------- | ----------- | --------------------- |
| open / connecting | 不额外查询  | respond               |
| 非 live           | 有          | respond，然后 resume  |
| 非 live           | 无          | recover，并泵入新 SSE |

提交失败会重新暴露待审批项并沿 Chat 的 `onError` 反馈；当前没有持久化审批提交的 exactly-once 保证。

## 状态与失败边界

- 连接相位为 `idle / connecting / open / closed`。现有 `useFsm` 只保存当前 phase，`transitionTo` 不校验迁移表；安全依赖调用点约束与 operation/epoch 校验，而不是类型或状态机本身。
- 历史 `replace` 与 `prepend` 共用加载 FSM；版本号、session 最新值和 finally 中的条件清理用于阻止旧请求覆盖或错误结束新加载。
- SSE 非 2xx 在 API 边界转为领域错误；事件内容必须经过事件大小限制、JSON 解析、基础 Schema 和已知事件归一化。当前基础 SSE Schema 允许任意非空 `type`，已知事件字段不完整时可能直到 AI SDK 解析才失败。
- `useChat` 的 `ChatStatus` 仍是消息流和 UI busy 的事实来源；ChatTurn 没有另建一套全局 turn store。
- 当前没有真实后端联调证据覆盖断流、重连、取消、审批超时和坏事件；mock、静态检查或 CI 通过不能替代这些验证。

## 关键实现

- [ChatTurn service](service/ChatTurnServices.impl.ts)
- [SSE normalizer](service/chatSseNormalizer.ts)
- [Message runtime](runtime/message/useChatMessage.ts)
- [History runtime](runtime/history/useChatHistory.ts)
- [Connect actions](runtime/connect/useConnectActions.ts)
- [Connect resume](runtime/connect/useConnectResume.ts)
- [Approval runtime](runtime/approval/useChatToolApproval.ts)
