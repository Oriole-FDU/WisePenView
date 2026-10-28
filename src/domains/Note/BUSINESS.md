# Note 领域业务知识

> Canonical owner：`src/domains/Note`

## 范围

本文件拥有 NOTE／DRAWIO 共用资源服务、协同 session 与正文 signature 的语义。文字笔记的私有用户流程由 [Note editor workflow](../../components/editors/note/BUSINESS.md) 拥有；资源名称、位置与共用权限由 [Resource](../Resource/BUSINESS.md) 拥有。

Draw.io 的版本选取、保存任务与退出由 [Draw.io workflow](../../components/editors/drawio/BUSINESS.md) 拥有。

Note 专用批注的 session、mapper 与 Yjs 锚点桥接统一由 [Note editor](../../components/editors/note/BUSINESS.md) 拥有，不在 domain 重复定义。

## 资源建立与标题

- 新建请求只传送标题、可选的资源类型，以及由 `pathTagId` 映射的 `mountTargetTagId`。类型仍有 `initial_content`／`source`，但目前 mapper 不传送，不能当成已支持正文初始化或来源派生。依据：[mapCreateNoteRequest](mapper/NoteServices.map.ts)、[CreateNoteRequest](service/index.type.ts)。
- 新建与复制是不同请求；复制走 `forkNote`，资源工具栏可带当前版本，不以新建的 `source` 字段代替。依据：[forkNote](service/NoteServices.impl.ts)、[ForkNoteRequest](service/index.type.ts)、[ResourceToolbarOperations](../../layouts/Resource/ResourceLayout/ResourceToolbar/ResourceToolbarOperations.tsx)。
- 标题是 Resource 名称，不是 Yjs 正文；`syncTitle` 委派 Resource rename。名称缓存成功更新与生命周期只由 Resource owner 定义。依据：[createNoteServices](service/NoteServices.impl.ts)、[Resource 名称规则](../Resource/BUSINESS.md)。

## 权限、协同与保存提示

- `canCollaborativeEdit` 取决于正规化后的 `currentActions` 是否含 EDIT，不是 owner ID 比对；NOTE／DRAWIO 自身权限概览沿用 Resource mapper。这是前端推导，不代替后端授权。依据：[mapNoteInfoDisplayFromApi](mapper/NoteServices.map.ts)、[mapNotePermissionOverviewFromApi](mapper/NoteServices.map.ts)。
- IDB room 以 account 与 resource 隔离；没有 actor ID 或使用 local mock preview 时不建立 IDB。这不承诺离线冷启动能打开笔记。依据：[noteYjsIdbRoomName](session/useNoteSession.ts)、[useNoteSession](session/useNoteSession.ts)。
- WebSocket 的 connected 事件仍让协同观察器保持 connecting，收到非 false 的 sync 事件才上报 connected。IDB hydration、连接状态与正文保存提示是不同概念。依据：[NoteStatusObserver](session/NoteStatusObserver.ts)、[useNoteSession](session/useNoteSession.ts)。
- 正文 `saved` 根据本地 Yjs 更新、连接与 WebSocket 发送队列推估；断线可进入 waiting，没有后端持久化 ACK。不能把此提示当成内容已写入正式存储的证明。依据：[NoteSaveStatusObserver](session/NoteSaveStatusObserver.ts)。

## 正文 signature 与 Draw.io 快照

- client signature 的 hash 只投影 block ID／type、正文、children 及有限稳定属性，不纳入标题、一般样式或 AI sidecar；没有 body hash 时不产生 signature。它不是完整文件杂凑、后端 CAS 或防冲突版本锁。依据：[computeNoteBodyContentHash](session/contentSignature.ts)、[encodeNoteClientContentSignature](session/contentSignature.ts)。
- Draw.io 保存把完整 UTF-8 XML 编成 Base64，附 caller 提供的版本及 plainText，与文字笔记的 Yjs 正文同步不同。mapper 只传递这些数据，不建立后端版本不可变性或并发控制保证。依据：[mapSaveDrawIoSnapshotRequest](mapper/NoteServices.map.ts)、[saveDrawIoSnapshot](service/NoteServices.impl.ts)。

## 尚未由前端证明的事项

正式权限、内容持久化、离线可用性与历史版本语义不能由 entity、session 状态或 API 字段存在推导；上述规则只描述目前前端的请求与状态边界。
