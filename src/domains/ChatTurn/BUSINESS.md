# ChatTurn 领域业务知识

> Canonical owner：`src/domains/ChatTurn`

## 范围

本文件拥有 Chat 单轮消息的发送、SSE 接收、恢复、重连、active turn 查询与取消语义。会话身份、历史与附件由 [ChatSession](../ChatSession/BUSINESS.md) 拥有；输入流程和工具审批 UI 由 [Chat workflow](../../components/business/Chat/BUSINESS.md) 拥有。

## 流式生命周期

- 新消息、工具结果恢复和断线重连使用三个独立 checked SSE Contract；重连只携带 session ID，不把会话历史伪装成新的 completion 请求。依据：[ChatStreamApi](apis/ChatStreamApi.contract.ts)、[ChatTurnApi](apis/ChatTurnApi.contract.ts)。
- Runtime 加载已有 session 时会对齐 active turn，并在需要时通过 SSE 接续。切换 session 后，旧 session 的迟到结果不得覆盖当前状态。依据：[SessionRuntime](../../runtime/chat/SessionRuntime/index.impl.ts)。
- 停止前端 stream 与调用后端 cancel 是不同动作；后台 turn 仍可能存活并可在后续页面恢复。依据：[ChatTurnServices](service/ChatTurnServices.impl.ts)、[SessionRuntime](../../runtime/chat/SessionRuntime/index.impl.ts)。
- 当前活跃回合收到审批决定时调用 `respondTurn`；若加载的回合已挂起，则通过 SSE recovery 提交审批决定并接续流。依据：[ChatTurnApi](apis/ChatTurnApi.ts)、[SessionRuntime](../../runtime/chat/SessionRuntime/index.impl.ts)。

## 证据限制

mock SSE 只返回最小完成事件，不证明正式服务端断流、重连、工具审批或终止行为；这些场景仍需要授权的联调环境验证。
