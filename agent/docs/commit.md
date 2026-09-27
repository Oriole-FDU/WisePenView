# Commit 与分支规范

本项目使用现有 commitlint 配置、Conventional Commits 的 type 白名单，并要求中文说明。

## 一、分支命名

新建工作分支（包括 Agent 创建的分支）统一使用：

```text
<type>/<topic>
```

例如：

```text
feat/group-role
fix/login-timeout
refactor/resource-mapper
docs/branch-convention
```

规则：

- `type` 使用下文 commitlint 的 type 白名单，按工作意图选择，不以执行者身份命名。
- `topic` 使用小写英文字母或数字组成的词，以 `-` 分隔；建议从模块或领域名开始，再补充具体任务，例如 `group-role`。
- `topic` 是分支主题，commit 的 scope 可以对应其模块，但不要求与整个 `topic` 相同；例如 `feat/group-role` 可提交 `feat(group): ...`。
- 已存在的分支不强制重命名；在原 PR 分支继续修改时沿用原分支名。

新分支格式可用以下正则核对（commitlint 本身只校验 commit message，不校验分支名）：

```text
^(feat|fix|docs|style|refactor|perf|test|chore)/[a-z0-9]+(-[a-z0-9]+)*$
```

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

- [ ] 新建工作分支符合 `<type>/<topic>`。
- [ ] commit type 属于白名单。
- [ ] subject 是中文。
- [ ] 一次 commit 只表达一个意图。
- [ ] 未提交无关文件。
