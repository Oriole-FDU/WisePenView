# Agent 编辑工作流程业务知识

## 范围

本文件拥有 Agent 编辑器的工作区版本选择、草稿状态、保存／发布、资产与聊天调试流程。Agent 数据与版本 API 由 [Agent domain](../../../domains/Agent/BUSINESS.md) 拥有。

## 规则

- 工作区以目前用户 ID 与 Agent `ownerId` 比较计算 `isOwner`；非 owner 的 UI 不提供编辑，且版本选择器将版本停用。这是前端显示与流程限制，不是后端授权证明。依据：[useAgentVersionController](controllers/useAgentVersionController.ts) 的 `load`、`selectVersion`、`disabledVersionKeys`。
- owner 编辑目前草稿时以快照比较 dirty 状态；查看历史版本、保存、发布或切换版本期间为唯读。退出有未保存修改时，runtime 通过 `prepareDraftExit` 提供保存或舍弃选项。依据：[useAgentDraftSessionController](components/AgentWorkspace/controllers/useAgentDraftSessionController.ts) 的 `snapshotAgentDraft`、`isReadOnly`，以及 [AgentWorkspace](components/AgentWorkspace/index.tsx) 的 `prepareDraftExit`。
- 保存送出一份草稿快照；同一时间重复的保存请求共用进行中的 Promise。发布前若草稿 dirty，先保存，保存成功后才调用 publish。domain 储存契约与限制详见 [Agent domain](../../../domains/Agent/BUSINESS.md)。依据：[useAgentDraftSessionController](components/AgentWorkspace/controllers/useAgentDraftSessionController.ts) 的 `saveDraftRequest`、`publishRequest`。
- owner 开启 system prompt 为空的目前草稿时，编辑器先以 guided prompt 默认内容初始化本地 draft；这不代表已自动保存到后端。依据：[useAgentDraftSessionController](components/AgentWorkspace/controllers/useAgentDraftSessionController.ts) 的 `initialDraft`、[guided prompt](guidedPrompt/index.ts) 的 `buildGuidedPrompt`。
- owner 查看目前草稿时可将草稿 Agent 注入 Chat 调试；若草稿 dirty，送出会等待确认，且只有保存成功才继续。历史版本与非 owner 不注入目前草稿。依据：[AgentWorkspace](components/AgentWorkspace/index.tsx) 的 `debugAgent`、[useAgentDebugSendGuardController](components/AgentWorkspace/controllers/useAgentDebugSendGuardController.ts) 的 `interceptSend`、`confirm`。
- asset 多档上传按顺序逐档提交；上传或删除成功后重新读取 draft version 的资产清单。依据：[useAgentAssetsController](components/AgentEditor/controllers/useAgentAssetsController.ts) 的 `uploadRequest`、`refreshAssets`、`deleteRequest`。

## 尚未由前端证明的事项

工作区中的 owner 判断、版本停用、dirty 状态与成功提示不代表服务器授权或持久化状态；正式权限及保存／发布结果须以 API 响应与后端规则为准。
