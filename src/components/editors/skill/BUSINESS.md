# Skill 编辑工作流程业务知识

> Canonical owner：`src/components/editors/skill`

## 范围

本文件拥有 Skill 工作区、文件树、保存队列、本地草稿及离开流程；版本、owner 编辑资格与 asset 服务契约只由 [Skill domain](../../../domains/Skill/BUSINESS.md) 定义。

## 工作区与本地恢复

- 版本、文件、Config、预览状态由工作区维护，不进 URL。工作区 key 包含 account、resource 与 draft version；key 改变会初始化状态，IDB 的旧读取在 cleanup 后不套用。这不是所有非同步 consumer 都有跨工作区隔离的保证。依据：[SkillEditorContent](index.tsx)、[useSkillWorkspaceDraftController](controllers/useSkillWorkspaceDraftController.ts)、[useSkillWorkspaceCacheController](controllers/useSkillWorkspaceCacheController.ts)。
- IDB key 以 account／resource 隔离，snapshot 另校验 schemaVersion 与 draftVersion；v1 无法证明账号归属的快照在升级时丢弃。TTL 为 24 小时，容量上限估计为 8 MiB；本地恢复是 best-effort，不是远程保存。依据：[createSkillDraftCacheKey](utils/skillDraftCache.ts)、[openSkillDraftDb](utils/skillDraftCache.ts)、[isMatchingCache](controllers/useSkillWorkspaceCacheController.ts)。
- cache controller 在恢复完成后以 500ms 防抖写入有修改的草稿，pending intent 不写入快照；清理会让旧写入 token 失效，读写／清理失败不阻断目前编辑。不要省略 account 或只靠 resourceId 恢复。依据：[useSkillWorkspaceCacheController](controllers/useSkillWorkspaceCacheController.ts)。

## 保存与版本互动

- 文件与 Config 分别建立 revision snapshot；旧保存结果只清除相同 revision 的 draft，新编辑保留。多档保存可部分成功，成功者更新基线，失败者仍需处理。依据：[applySavedSkillFiles](models/workspaceDraft.ts)、[applyConfigSave](controllers/useSkillWorkspaceDraftController.ts)。
- 队列显示 pending／preparing／uploading／failed，成功任务移除；再次保存使用当前待存 snapshot，不保证重送先前失败的原始内容。同类别并行保存会等待既有 Promise；saveAll 先文件后 Config，不是原子保存。依据：[useSkillSaveController](controllers/useSkillSaveController.ts)。
- 发布需 owner、有根 SKILL.md 且 Config 完整；保存中不发布或切换版本。有修改的发布、切换版本、取消编辑进入 pending intent；保存后仍 dirty 不继续，取消意图保留草稿，舍弃后按原意图执行。依据：[useSkillNavigationController](controllers/useSkillNavigationController.ts)。
- 离开／切换资源通过 runtime 的退出协商，不是 navigation controller 的 pending intent；Save 等保存与状态提交，Discard 丢弃工作区并清本地 cache。未完成文件移动／删除也列入 pendingWork，不承诺正式 OSS 持久化。依据：[SkillEditorContent](index.tsx)、[prepareDraftExit](../_runtime/draftExit.ts)。
- 远程文件读取带目前 viewingVersion；文件树的建立／删除／移动由 file actions 编排，通过公开 callback 更新工作区，asset 的候选清理及身份规则不在此重订。依据：[useSkillFileActionsController](controllers/useSkillFileActionsController.ts)、[Skill domain](../../../domains/Skill/BUSINESS.md)。
