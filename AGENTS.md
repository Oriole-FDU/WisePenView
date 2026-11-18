# WisePenView Agent 规约

本文件是常驻入口，只保存跨任务稳定的约束。详细规则按任务读取，同一规则不在多个文档重复定义。

## 项目事实

- 技术栈：Vite、React 19、TypeScript strict、SCSS CSS Modules、HeroUI、ahooks、zustand；运行版本以 `.nvmrc` 和 `package.json#packageManager` 为准。
- 注释和 commit message 使用简体中文，commit message 遵循中文 Conventional Commit。

## 阅读顺序

- 本文件：跨任务入口和文档路由。
- `agent/README.md`：AI 开发基建、Skill、Workflow 与模板如何协作。
- `agent/docs/README.md`：按任务类型查找架构与编码专题。
- 触及领域行为时，同时读取对应 `BUSINESS.md`；业务规则以离代码最近的 canonical owner 为准。
- `agent/docs/dag-domain-refactor-review.md` 是冻结的历史审查，不是现行契约。

## 硬约束

- 新写文档、注释和提交信息使用简体中文；外部原文引用保持原貌。
- 代码标识符、接口字段和 URL 不参与字形转换。
- 保留用户已有改动；不覆盖无关工作区文件，不重写已有 Git 历史。
- 依赖方向与模块边界以 `agent/docs/` 的专题规则为准。新增规则优先落到类型、lint、脚本或测试；无法确定性校验时才写散文档。
- 修改契约、状态生命周期或异步副作用时，必须区分已确认行为、合理推断和待运行态验证的假设。
- 任务交付不默认新增持久化测试；一次性验证执行后可丢弃，新增常驻测试必须说明长期风险与维护收益，不能仅以本次修改需要验证为由。

## 验证与提交

- 按 `agent/docs/verification.md` 选择最小充分验证，并在交付中只记录实际执行过的命令与结果。
- Commit 格式、分支和暂存范围以 `agent/docs/commit.md` 为准。
