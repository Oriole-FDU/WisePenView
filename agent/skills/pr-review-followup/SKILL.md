---
name: wisepen-pr-review-followup
description: 读取 WisePenView PR 的人工 Review 和 CI 反馈，在原分支逐条完成修复并重新验证。
---

# 处理 PR Review

## 前置条件

- 用户提供 PR URL/编号，或当前任务已经绑定该 PR。
- 当前分支是该 PR 的 head，或用户允许切换到对应分支。
- push、发送回复和关闭线程仍需用户明确授权。

## 执行步骤

1. 读取 PR 描述、diff、CI、评论和 Review 状态，确认 base/head SHA 没有变化。
2. 按“必须修复、建议修改、需要确认、无关评论”分类，并建立评论到文件/行的映射。
3. 对每条必须修复或已确认的建议，先说明修改意图，再在原 PR 分支实施。
4. 运行受影响的 lint、typecheck、check:mock、build 或用户授权的运行态验证。
5. 生成 `agent/templates/review-response.md` 格式的回复草稿，说明修改位置和验证结果。
6. 用户授权后提交中文 review-fix commit、push，并逐条回复或更新 PR。

## 完成标准

- 每条有效评论都有处理结论。
- 没有为 Review 修复新开无关 PR。
- 验证结果对应本轮实际修改，未把旧 CI 结果冒充新结果。
