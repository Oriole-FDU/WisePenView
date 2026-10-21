# Note 编辑工作流程业务知识

> Canonical owner：`src/components/editors/note`

## 范围

本文件拥有文字笔记的初始化、编辑、标题、汇入、AI Diff 与 Chat 桥接流程。共用资源服务、协同 session 与 signature 投影由 [Note domain](../../../domains/Note/BUSINESS.md) 拥有，不在此重复定义。

## 编辑、标题与退出

- connecting 或没有 EDIT 时 editor 唯读；本地 Yjs 写保护等同步完成且没有 EDIT 时才启用，避免拦截 BlockNote 初始化。具 EDIT 的 disconnected 并非一律唯读，不能将此例外扩大成完整离线能力保证。依据：[NoteEditorSession](CustomBlockNote/NoteEditorSession.tsx)。
- 标题与正文分开储存；标题以 500ms 防抖送出，trim 后空值使用未命名标题，旧请求不覆盖较新编辑的储存提示。标头状态优先顺序为标题 failed、正文 waiting、任一 saving、最后才 saved。依据：[NoteTitle](components/NoteTitle/index.tsx)、[resolveNoteHeaderSaveStatus](components/NoteWorkspace/noteWorkspaceModel.ts)。
- Note 自订退出策略只协商尚未完成的图片工作，不承诺退出时 flush 标题或等待正文持久化；`hasUnsavedChanges` 与图片 `pendingWork` 不是同一状态。依据：[NoteWorkspace](components/NoteWorkspace/index.tsx)。

## 汇入与 AI Diff

- Markdown 汇入先建立资源，再把正文放入 tab-scope 记忆体待办，协同 ready 后才写入编辑器。成功与解析失败都消费待办，没有对已建立资源的回滚；不能把新建成功当成正文已汇入。依据：[useMarkdownNoteImport](hooks/useMarkdownNoteImport.ts)、[usePendingNoteImportStore](_store/usePendingNoteImportStore.ts)、[useNoteEditorHydration](CustomBlockNote/runtime/useNoteEditorHydration.ts)。
- AI Diff 使用正文旁的 Yjs sidecar；接受／拒绝动作在同一 AI action origin 的 transaction 中更新正文与 sidecar，整块删除会清除子树的 sidecar。bulk review 只在有差异、compare 且可写时显示。依据：[applyNoteAiDiffAction](CustomBlockNote/engines/aiDiff/action.ts)、[removeBlockWithAiContent](CustomBlockNote/engines/aiDiff/action.ts)、[useNoteAiDiff](CustomBlockNote/runtime/useNoteAiDiff.ts)。
- AI Diff preview 使用 localOnly session，不连协同服务；预览灌入不能当成正式协同或后端保存证据。依据：[NoteEditorSession](CustomBlockNote/NoteEditorSession.tsx)、[useNoteEditorHydration](CustomBlockNote/runtime/useNoteEditorHydration.ts)。

## Chat 与原文定位

- Note Chat provider 只在协同 connected 且正文 signature 不再 pending 时解除阻挡；选区以文字及 scope 写入 frontend state，不能把选区展示或前端可送出状态当成后端已消费的证据。依据：[createNoteChatStateProvider](NoteChatProtocol.ts)、[createNoteSelectionChatContext](NoteChatProtocol.ts)。
- 原文连结由 `wisepen://note/<id>#p_<blockId>` 协定解析；同一笔记只卷动，其他笔记先开启再定位。定位请求有 TTL 与重试期限，新请求会让旧定位停止；送出导航意图不保证目标 block 仍存在或一定能定位。依据：[parseNoteLinkUrl](noteLinkProtocol.ts)、[resolveNoteLinkAction](noteLinkProtocol.ts)、[createNoteExternalNavigationRequest](noteExternalNavigationModel.ts)、[useNoteExternalNavigationController](components/NoteWorkspace/useNoteExternalNavigationController.ts)。

## Note 专用批注桥接

- Note mapper 只接收 start／end 为非空字串的 thread，其余过滤；真正能否解码及解析要交给 Yjs 锚点层。建立时以 composer retry key 作 externalAnchorId，写入 start／end 与引文；Note 桥接目前不送版本栏位。依据：[mapThread](../../../domains/Note/mapper/NoteInlineCommentServices.map.ts)、[mapCreateRequest](../../../domains/Note/mapper/NoteInlineCommentServices.map.ts)。
- capture 要求非空选区、Yjs binding 与非空引文，以 Base64 编码 Yjs relative positions；结束点向左关联，避免边界后插入扩张批注。resolve 遇到无效编码、失效位置或零长度时回传 null，不保证永远可定位。依据：[captureInlineCommentDraft](CustomBlockNote/engines/inlineComments/relativePosition.ts)、[resolveInlineCommentAnchor](CustomBlockNote/engines/inlineComments/relativePosition.ts)。
- session 并行查询 active／resolved 两组资料，共用正在进行的 refresh；mutation 等既有 refresh 结束再刷新，建立结果未读到时再读一次，仍缺失才报错。只有首次载入显示 loading，后续刷新失败保留现有资料并显示 error。依据：[NoteInlineCommentSession](../../../domains/Note/session/NoteInlineCommentSession.ts)。
- 建立重试会先刷新，在目前 active 列表中找相同 externalAnchorId；回复重试只记录同一 session 已收到的 item ID，再刷新确认。回复请求未送 retry key，遗失建立回应、跨 session 或已移出 active 列表都不享有完整去重，不能宣称 exactly-once。依据：[NoteInlineCommentSession](../../../domains/Note/session/NoteInlineCommentSession.ts)、[mapAddItemRequest](../../../domains/Note/mapper/NoteInlineCommentServices.map.ts)。
- 装饰范围只来自 active threads；active 与 resolved 都可重新计算当前引文与位置。能解析的依文件位置排序，其余依更新／建立时间倒序；无法解析时保留原引文，不自行删除远端 thread。依据：[createInlineCommentExtension](CustomBlockNote/engines/inlineComments/extension.ts)、[NoteInlineCommentSession](../../../domains/Note/session/NoteInlineCommentSession.ts)。
- controller 每 8 秒轮询，选取 thread 会开侧栏并设定卷动目标；resolve 后清除对应 active ID，卸载销毁 session。这不是即时推播或跨使用者一致性的保证。依据：[useNoteCommentsController](components/NoteWorkspace/useNoteCommentsController.ts)。
- Note 将共享面板的图片场景设为私有 Note 图片；面板操作与提交保留规则由 [共享批注面板](../../business/InlineComment/BUSINESS.md) 拥有，URL／私有读取限制只由 [Image](../../../domains/Image/BUSINESS.md) 拥有。依据：[NoteWorkspace](components/NoteWorkspace/index.tsx)。

## 尚未由前端证明的事项

储存文案、唯读 UI、Yjs transaction 与 frontend state 不证明后端授权、正文持久化或跨请求原子性。图片的共用生命周期由 [Image](../../../domains/Image/BUSINESS.md) 拥有。
