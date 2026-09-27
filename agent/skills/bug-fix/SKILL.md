---
name: wisepen-bug-fix
description: 将 WisePenView 的 Bug 描述转成可验证的代码修复；适用于定位根因、修改代码和准备 PR。
---

# Bug 修复

## 触发条件

用户描述了现象、缺陷、回归、错误日志或期望行为，并要求定位或修复。

## 执行步骤

1. 查看 `git status --short`、当前分支和最近提交，确认没有覆盖用户已有改动。
2. 读取 `agent/workflows/bug-to-pr.md`、`agent/docs/verification.md`，再按变更范围读取架构专题。
3. 用 `rg` 搜索用户可见文案、函数名、路由、API 或错误信息，建立“触发 -> 状态 -> 请求/渲染 -> 结果”的根因链。
4. 写出最小修改范围和验收标准。接口、权限或协议不明确时先请求确认。
5. 用户要求实现时，在符合 `agent/docs/commit.md` 的 `fix/<topic>` 分支或隔离 Worktree 中修改；保持领域链路和现有错误边界。
6. 按验证矩阵运行检查，记录实际命令和结果。不要未经授权启动 dev server、mock 或浏览器。
7. 输出变更摘要、根因、验证、未验证项和剩余风险；用户明确要求时才继续 commit、push 或创建 PR。

## 完成标准

- 根因有代码证据，不是只改变表面文案或增加兜底。
- 修改范围只覆盖必要文件，旧路径和重复逻辑已删除。
- 相关 lint、typecheck、mock contract 或 build 已通过。
- PR 描述可以直接使用 `agent/templates/pull-request.md`。
