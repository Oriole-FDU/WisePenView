# Commit 与分支规范

本项目使用现有 commitlint 配置、Conventional Commits 的 type 白名单，并要求中文说明。

## 一、分支命名

Agent 自动创建分支时使用英文短横线命名：

```text
agent-<content>
```

人工开发分支如需按功能类型区分，可以使用：

```text
feat/<content>
fix/<content>
refactor/<content>
```

规则：

- `content` 推荐英文短横线，例如 `agent-docs`、`feat/group-role`、`fix/group-role`。
- 不使用空格和中文，避免远程分支、脚本和 CLI 兼容问题。
- 文档类变更也可以使用 `feat/docs-agent` 或 `fix/docs-agent`，按实际意图选择。

## 二、Commit 格式

格式：

```text
<type>(<scope>): <中文说明>
<type>: <中文说明>
```

示例：

```text
docs(agent): 新增项目规约入口
feat(group): 接入小组成员权限
fix: 修复登录态失效跳转
refactor(domain): 收敛资源映射逻辑
```

## 三、type 白名单

只使用现有 commitlint 允许的 type：

- `feat`：新功能。
- `fix`：修复 Bug。
- `docs`：仅修改文档。
- `style`：代码格式修改，不影响逻辑。
- `refactor`：重构，不修复 Bug 也不添加功能。
- `perf`：性能优化。
- `test`：添加或修改测试。
- `chore`：构建过程、辅助工具或杂项维护。

## 四、scope 规则

- scope 可选，不维护固定列表。
- 推荐使用模块、领域或任务名，例如 `agent`、`group`、`domain`、`table`、`auth`。
- scope 使用英文或项目内已有模块名，保持简短。
- 不要把多个无关 scope 塞进一次 commit。

## 五、subject 规则

- subject 必须使用中文。
- 简短明确，说明本次提交的真实意图。
- 避免“修改代码”“优化一下”“调整内容”这类不可审查描述。
- 不以句号结尾。
- 一次 commit 表达一个意图。

## 六、Agent 提交流程

- 提交前查看 `git status --short`。
- 不要把用户未要求的无关文件加入提交。
- 不要擅自回滚用户已有改动。
- 按改动范围运行 lint、typecheck 或 build，并在交付说明中报告结果。
- 如果用户要求 agent commit，commit message 必须中文，并符合本文件格式。

## 七、检查清单

- [ ] Agent 分支名符合 `agent-<content>`。
- [ ] commit type 属于白名单。
- [ ] subject 是中文。
- [ ] 一次 commit 只表达一个意图。
- [ ] 未提交无关文件。
