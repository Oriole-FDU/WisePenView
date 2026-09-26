# WisePenView AI 开发基建

本目录把项目规约、Codex 工作流和 PR 协作模板分开管理。根目录 `AGENTS.md` 是常驻入口；本目录内容按任务类型读取。

## 目录职责

| 目录         | 用途                                          |
| ------------ | --------------------------------------------- |
| `docs/`      | 架构、分层和编码规范，解释“应该怎么设计”      |
| `skills/`    | Codex 可重复执行的任务流程，入口是 `SKILL.md` |
| `workflows/` | 团队协作阶段、人工关卡和完成条件              |
| `templates/` | Bug、PR、Review 回复的标准输入输出            |

Skill 只写触发条件、执行步骤和完成标准；长说明放在 `references/`，确定性脚本放在 `scripts/`。不要把整个项目架构复制进 Skill，也不要让脚本隐式执行 push、创建 PR 或发送外部评论。

## 标准工作流

```text
Bug 描述
  -> 定位根因和验收标准
  -> 创建符合 docs/commit.md 的 <type>/<topic> 分支或 Codex Worktree
  -> 修改代码
  -> 按变更范围验证
  -> 生成 PR
  -> CI + 人工 Review
  -> 在原 PR 分支逐条处理 Review
  -> 再次验证并提交
```

默认基线是 `main`。只有用户明确说明时才 push、创建 PR、发送 GitHub 评论或修改仓库设置。

## 文档维护

- 架构规则的唯一来源是 `docs/`，不在 Skill 和 PR 模板中复制另一套规则。
- 新增规则前先确认能否通过 ESLint、TypeScript、CI 或脚本确定性验证。
- 每完成 5～10 个真实 PR，检查一次文档是否仍被使用；删除没有实际价值的流程和模板。
