# ChatTurn 领域业务知识

> Canonical owner：`src/domains/ChatTurn`

## 范围

本文件拥有 Chat 单轮消息的发送、SSE 接收、恢复、重连、active turn 查询与取消语义。会话身份、历史与附件由 [ChatSession](../ChatSession/BUSINESS.md) 拥有；输入流程和工具审批 UI 由 [Chat workflow](../../components/business/Chat/BUSINESS.md) 拥有。

## Runtime 状态与消息管线边界

领域边界由 [Runtime](runtime/useChatTurnRuntime.ts) 与 [Message Pipeline](runtime/useChatMessagePipeline.ts) 实现，设计背景见 [重构方案](../../../docs/chat-turn-runtime-refactor.md)。

| 状态轴                                           | 所有者                 | 语义                                                 |
| ------------------------------------------------ | ---------------------- | ---------------------------------------------------- |
| `localStream: idle / connecting / open / closed` | Runtime                | 本地 SSE 订阅生命周期，不推断后端 turn 是否存在      |
| `backendTurn: active(turnId) / none`             | Runtime 查询 `/active` | 断流后的续跑依据，只代表查询时快照，不长期缓存为真相 |
| `uiBusy`                                         | Runtime 派生           | 输入禁用、生成指示和跟滚，不参与协议选路             |

- Message Pipeline 只拥有 transport、SSE 归一化和 UIMessage 缓冲；向 Runtime 通知传输生命周期，不决定 respond、resume 或 recover，不向 UI 泄漏 SDK status 和工具审批能力。
- Runtime 显式维护本地状态：开流前为 `connecting`，连接建立为 `open`，正常完成为 `idle`，主动停止、异常或断流为 `closed`；错误由 Runtime 记录并交给 UI 提示。切换会话重置为 `idle`。

## 流式生命周期

- 新消息、工具结果恢复和断线重连使用三个独立 checked SSE Contract；重连只携带 session ID，不把会话历史伪装成新的 completion 请求。依据：[ChatStreamApi](apis/ChatStreamApi.contract.ts)。
- 审批提交按三条路径续跑：本地 `open / connecting` 时只调用 JSON respond；本地断流但 `/active` 返回 turn ID 时 respond 后 resume；无 active turn 时才调用 recover 开 SSE。审批请求体复用 recovery Schema，不改后端字段。依据：[resolveContinuation](runtime/resolveContinuation.ts)、[Runtime](runtime/useChatTurnRuntime.ts) 的 `submitToolApprovals`；过程见 [续跑时序](../../../docs/chat-turn-respond-sequence.md)。
- Runtime 合并同一会话、同一 stream lifecycle 的并发 resume；stop 或切换会话使请求和 turn 去重失效，返回原会话仍可重连；旧生命周期的迟到结果不能建立新连接。
- `stopLocalStream` 只中止前端订阅，不调用后端 cancel；后端 turn 仍可能存活并在后续页面恢复。后端终止由独立 Service `cancelTurn` 执行。依据：[ChatTurnServices](service/ChatTurnServices.impl.ts)。
- 会话身份、历史分页和审批弹窗状态均不属于 Runtime；关闭审批弹窗不等于提交允许或拒绝。

## 证据限制

mock SSE 只返回最小完成事件，不证明正式服务端断流、重连、工具审批或终止行为；这些场景仍需要授权的联调环境验证。
