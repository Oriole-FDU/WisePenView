---
name: wisepen-pr-create
description: 为已完成并验证的 WisePenView 修改准备分支、commit 和 Pull Request。
---

# 创建 PR

## 前置条件

- 修改已经完成，工作区和 staged 范围可以解释。
- 已按 `agent/docs/verification.md` 完成适用检查。
- 用户明确要求 push 或创建 PR。

## 执行步骤

1. 检查当前分支、远端、工作区和 staged 文件；发现非本任务改动或范围重叠时停止并说明。
2. 默认以 `main` 为基线创建 `agent-<content>` 分支；只有用户明确指定时使用 `dev`。
3. 使用中文 Conventional Commit，type 仅使用 commitlint 白名单，subject 描述真实意图。
4. 校验 diff：没有密钥、用户隐私、无关格式化、临时文件或构建产物。
5. 使用 `agent/templates/pull-request.md` 生成 PR body，填写实际验证结果和未验证项。
6. 在用户授权范围内 push 分支并创建目标为 `main` 的 PR；不要自动合并、关闭讨论或发送额外评论。
7. 返回分支名、commit、PR URL、CI 状态和人工 Review 重点。

## 完成标准

- PR 只包含本任务改动。
- commit 和 PR 标题符合中文 Conventional Commit。
- PR body 有问题、根因、变更、验证、风险和 Review 指引。
