# Bug 到 PR 工作流

## 阶段一：理解问题

输入使用 `agent/templates/bug-report.md`。Codex 必须区分已知事实、推断和待确认信息，并写出验收标准。

如果工作区有用户改动，先记录并避开；不能为了复现或整理 diff 而回滚这些改动。

## 阶段二：定位与计划

读取根入口和相关专题文档，用 `rg` 建立调用链。计划至少说明：

- 触发入口和实际结果。
- 根因所在层级。
- 要修改和不修改的文件。
- 是否需要 API、mapper、service、store、路由或样式变更。
- 验收标准和验证命令。

接口字段、权限、后端行为或正式环境现象不明确时先确认，不用兜底代码掩盖。

## 阶段三：实现与验证

默认从 `main` 创建符合 `agent/docs/commit.md` 的 `fix/<topic>` 分支；大任务使用 Codex Worktree。修改完成后按 `agent/docs/verification.md` 验证，运行态检查必须得到用户授权。

## 阶段四：提交与 PR

只有用户明确要求时才执行 commit、push 和创建 PR。PR body 使用 `agent/templates/pull-request.md`，必须包含问题、根因、变更、验证、未验证项、风险和 Review 重点。

## 阶段五：人工 Review

PR 进入人工 Review 后，使用 `agent/workflows/review-to-patch.md` 处理反馈。所有修复回到原 PR 分支，不新开无关 PR。
