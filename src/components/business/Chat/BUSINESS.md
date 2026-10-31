# Chat 对话流程业务知识

## 范围

本文件拥有共用 Chat 输入、会话切换、消息传送、历史与工具审批的前端流程。会话数据由 [Chat domain](../../../domains/Chat/BUSINESS.md) 拥有，模型／Provider／Tool／能力选项由 [ChatConfig domain](../../../domains/ChatConfig/BUSINESS.md) 拥有；URL 规则由 [routing 规范](../../../../agent/docs/routing.md) 拥有。

## 规则

- 新对话在首次发送消息或上传附件时按需建立后端 session；只上传附件、尚未发送消息也可能建立会话。建立前检查登录，若本次指定的 Agent ID 或版本与 session 不符，先更新 session Agent。建立完成后以后端 session ID 更新路由，再要求侧栏历史刷新。依据：[useChatSessionController](_controllers/useChatSessionController.ts) 的 `ensureSession`、`syncNewSessionHistoryRefresh`、[useChatTurnController](_controllers/useChatTurnController.ts) 的 `send`、[ChatConversation](ChatConversation/index.tsx) 的 `getUploadSessionId`、[ChatInputFileProvider](ChatConversation/ChatInput/_context/ChatInputFileProvider.tsx) 的 `uploadAndAddAttachment`。
- 选取其他会话或开始新对话会清除资源对话上下文与新建会话暂存标记。会话切换时输入 store 的 session version 用来让旧输入非同步工作失效；草稿升级则保留同一版本。依据：[useChatSessionController](_controllers/useChatSessionController.ts) 的 `handleSelectSession`、`startNewChat`、[createChatInputStore](ChatConversation/ChatInput/_context/ChatInputStore.ts) 的 `sessionVersion` 与 `setToolSelectionSession`。
- 传送需登录、选到模型、完成附件上传，且没有资源上下文阻挡或不相符状态；必要时先确保 session，再将前端状态、选用资源、启用附件、Skill／Tool 选择送交 Chat transport。输入层等待送出 callback 接受，且会话版本未变时才清空输入与附件；turn controller 启动非同步传送后即返回接受，不等待 stream 完成，也不保证后端成功或失败时恢复草稿。依据：[useChatInputController](ChatConversation/ChatInput/useChatInputController/index.ts) 的 `handleSend`、[createChatInputStore](ChatConversation/ChatInput/_context/ChatInputStore.ts) 的 `clearAfterSend`、[useChatTurnController](_controllers/useChatTurnController.ts) 的 `send`、[useChatSession](../../../domains/Chat/session/useChatSession.ts) 的 `sendSessionMessage`。
- 聊天历史可分页加载；替换会话历史前清空旧消息，较旧页与当前消息依 message ID 去重。切换会话或请求版本变更后完成的旧请求不套用。依据：[useChatHistory](../../../domains/Chat/session/useChatHistory.ts) 的 `replaceHistory`、`prependHistory`、`mergeMessages`。
- 有活动 turn 时，前端查询 active turn 并恢复 SSE；同一 session／stream lifecycle 的重复恢复会合并，避免重复连接。取消时同时停止前端 stream 并调用后端 cancel API。依据：[useChatSession](../../../domains/Chat/session/useChatSession.ts) 的 `resumeSessionStream`、[useChatTurnController](_controllers/useChatTurnController.ts) 的 `cancel`。
- 工具调用进入 `approval-requested` 时须明确允许或拒绝；所有待审批项有决定后，前端以结果恢复同一轮对话。关闭审批视窗不会隐式批准或拒绝。依据：[useChatToolApproval](_controllers/useChatToolApproval.ts) 的 `decide`、[listToolApprovalRequests](_controllers/toolApprovalModel.ts)、[ToolApprovalDialog](ToolApprovalDialog/index.tsx) 的 `handleOpenChange`。
- Agent 编辑器的草稿调试与传送前确认流程由 [Agent editor workflow](../../editors/agent/BUSINESS.md) 拥有。

## 语音输入

- 语音输入先检查安全情境与麦克风 API，取得音频轨道后才申请凭证。此流程选用 2500ms EOS；允许范围、信任边界、语言与识别生命周期由 [Speech domain](../../../domains/Speech/BUSINESS.md) 拥有。依据：[useVoiceInput](ChatConversation/ChatInput/VoiceInput/useVoiceInput.ts)。
- 开始时保存输入基底；每次即时 transcript 都与该基底重新合并，必要时补一个空格，不在上一份 transcript 后持续累加。开始失败或识别错误恢复原文；正常完成保留已合并结果，不自动送出。依据：[mergeInputValue](ChatConversation/ChatInput/VoiceInput/useVoiceInput.ts)、[useVoiceInput](ChatConversation/ChatInput/VoiceInput/useVoiceInput.ts)。
- 非 idle 期间输入框 readonly、送出按钮 disabled；listening 可再按语音按钮 stop，权限申请、凭证取得、connecting 与 finishing 期间该按钮 disabled。这是 UI 限制，不是所有程序化送出路径的 domain 保证。依据：[useChatInputController](ChatConversation/ChatInput/useChatInputController/index.ts)、[useVoiceInput](ChatConversation/ChatInput/VoiceInput/useVoiceInput.ts)。
- 卸载使旧非同步 operation 失效，取消 recognizer 并释放现有音频轨道；迟到的麦克风取得结果也会停止音频轨道。卸载取消不是正常完成或错误响应流程，不能承诺保留／恢复跨卸载的输入草稿。依据：[useVoiceInput](ChatConversation/ChatInput/VoiceInput/useVoiceInput.ts)。

## 尚未由前端证明的事项

前端送出的附件／Skill／Tool／模型选项不构成后端授权或成功执行的证据；stream metadata 的历史持久化、资源上下文在后端的消费语义，依后端契约而定。
