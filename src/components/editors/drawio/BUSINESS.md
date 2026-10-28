# Draw.io 编辑工作流程业务知识

> Canonical owner：`src/components/editors/drawio`

## 范围

本文件拥有 Draw.io 的加载、储存与退出流程。资源权限推导与完整快照传输由 [Note domain](../../../domains/Note/BUSINESS.md) 拥有；不将此流程套用到文字笔记的 Yjs 同步。

## 初始化与入口

- 编辑与储存入口取决于 `canCollaborativeEdit`；历史入口还要求目前用户是 owner。这些是前端 gate，不证明后端授权。依据：[DrawioViewConnected](index.tsx)、[useDrawioEditorSession](hooks/useDrawioEditorSession.ts)。
- 初始版本取 Note info 与 snapshot 版本的较大值；初始化只解码 `fullSnapshot`，不回放 DTO 的 deltas。版本徽章或历史清单不证明版本不可变性。依据：[DrawioViewConnected](index.tsx)、[DrawioEditorContent](index.tsx)。
- 只接受同时符合设置 origin 与目前 iframe window 的消息；autosave 事件只观察 XML／dirty，不调用保存 API。save 事件直接保存 XML，工具列储存则先要求 export。依据：[useDrawioEditorSession](hooks/useDrawioEditorSession.ts)。

## 完整储存任务

- 一次储存 Promise 包含 XML export 等待及 API 请求；已有任务时，并行储存共用该 Promise，不再各自 export。已是 saved 时可直接完成。依据：[createDrawioSaveSession](drawioSaveSession.ts)。
- 每次成功储存采目前版本加一；只有 revision 与最新 XML 都仍对应本次保存内容，才上报 saved，期间的新修改保留 dirty。不能以较早请求成功宣称当前页面内容已储存。依据：[createDrawioSaveSession](drawioSaveSession.ts)。
- export 等待 10 秒后失败，API 失败也拒绝同一任务，后续可重试；这个 timeout 不涵盖整个后端请求。无待接收 export 时忽略迟到消息；export 协定没有请求 ID，不承诺能区分跨重试的所有迟到 export。依据：[createDrawioSaveSession](drawioSaveSession.ts)、[useDrawioEditorSession](hooks/useDrawioEditorSession.ts)。
- session 销毁会拒绝未完成任务；activate 可让重挂后重新储存。后端响应须仍属同一 pending task 且 session 未销毁才更新状态，不会把旧任务结果写进新任务；这不等于取消已送出的后端写入。依据：[createDrawioSaveSession](drawioSaveSession.ts)。

## 退出与证据限制

- 自订退出的 Save 等待完整 `requestSave`，再等待一个 animation frame 让状态提交；Discard 只放行当次离开，不取消已发出的保存。编辑器通过 runtime 上报 dirty／saving，不另建宿主储存流程。依据：[DrawioViewConnected](index.tsx)、[prepareDraftExit](../_runtime/draftExit.ts)。
- 既有 runtime 测试涵盖并行保存、新修改、失败、export 超时与 session 重挂，是本地任务状态的证据，不是正式后端、iframe 端到端或持久化验收。依据：[createDrawioSaveSession](../../../../tests/editor-runtime.test.mjs)。
