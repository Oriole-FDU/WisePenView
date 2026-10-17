# Skill Editor Workflow 业务知识

> Canonical owner：`src/components/editors/skill`

## 范围

本文档只涵盖 Skill 编辑器的工作区状态、文件树互动、保存队列、local draft cache、版本浏览与离开守卫。Skill 的版本与 asset 业务规则以 [`src/domains/Skill/BUSINESS.md`](../../../domains/Skill/BUSINESS.md) 为准。

## 核心流程

- Skill 的版本、文件、配置和预览状态不进入 URL，由编辑器工作区维护。依据：[编辑器入口](index.tsx)、[导航流程](controllers/useSkillNavigationController.ts)。
- 工作区以 account、resource 与 draft version 组合识别；切换 resource 或版本时，旧工作区草稿不可回写新工作区。
- 文件树、Config 与版本浏览是不同 UI 状态，但保存 snapshot 必须使用当次 revision，避免新编辑被旧请求标记为已保存。
- local draft cache 是 best-effort 恢复能力；读取、写入或清理失败不得阻断目前编辑流程。
- save queue 展示文件／Config 的准备、上传、成功与失败；重试只针对失败 snapshot，不重新推导已更改内容。
- 有未保存更改时离开、切换版本或切换资源必须进入 pending intent；确认后才执行原本意图，取消则保留工作区。

## 状态与边界

- `useSkillWorkspaceDraftController` 拥有 reducer、选取、文件／Config draft、save snapshot 与工作区意图。
- cache controller 只拥有 IndexedDB load、debounced write、失效 token、clear 与 cleanup，不拥有 UI 选取或 save queue。
- file actions controller 拥有文件树添加、删除、移动与远端内容载入；save controller 拥有请求队列与错误结果。
- editor 顶层只负责组合 controllers、传递语义化 callback 与排列画面，不重新实现任何一个 controller 的状态机。

## 特殊判断与禁止事项

- 不把 account 省略在 draft cache key；resourceId 单独不足以隔离不同账号。
- 不以 `useEffect` 取代用户事件；外部 IndexedDB lifecycle 的必要 effect 必须保留 `@wisepen-manual-effect` 说明与 cleanup。
- 不让 pending intent 直接调用另一个 controller 的内部 setter；由顶层在确认后调用公开意图方法。

## 历史决策

| 决策                                            | 原因与证据                           | 来源                                                                                |
| ----------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------- |
| 草稿 cache 按 account 与 resource／version 隔离 | 避免跨账号、跨版本恢复错误内容       | `src/components/editors/skill/utils/skillDraftCache.ts`、`models/workspaceDraft.ts` |
| cache persistence 与 workspace reducer 分离     | 两者更改原因、cleanup 与测试边界不同 | 第一轮架构试点决策                                                                  |

## 相关代码

- `src/components/editors/skill/index.tsx`
- `src/components/editors/skill/controllers`
- `src/components/editors/skill/models/workspaceDraft.ts`
- `src/components/editors/skill/utils/skillDraftCache.ts`
