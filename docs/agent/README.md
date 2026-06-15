# Agent 规约导航

`docs/agent` 是 WisePenView 面向 agent 的开发规约目录。不要一次性预读所有文件，按任务类型选择需要的专题文档。

## 一、入口

- 主入口：`AGENT.md`
- 提交规范：`docs/agent/commit.md`

## 二、Domain 任务

处理 `src/domains/**`、`src/apis/**`、`src/_autoGen/**` 或请求链路时阅读：

- `domain-api.md`：API 薄层、autoGen 类型、请求协议边界。
- `domain-mapper.md`：字段转换、fallback、旧接口兼容、归一化。
- `domain-service.md`：业务编排、依赖注入、错误处理。
- `domain-entity.md`：展示实体、枚举、常量和类型边界。

推荐阅读顺序：`domain-service.md -> domain-mapper.md -> domain-api.md -> domain-entity.md`。如果只是补接口，优先从 `domain-api.md` 开始。

## 三、Component 与 View 任务

处理 `src/components/**`、`src/views/**`、布局、样式或页面交互时阅读：

- `component-boundary.md`：组件放置位置、复用边界、迁移方向。
- `component-react.md`：React、Hooks、JSX、TypeScript 编码规范。
- `component-style.md`：Less、CSS Modules、HeroUI 与样式规则。

推荐阅读顺序：`component-boundary.md -> component-react.md -> component-style.md`。

## 四、跨层任务

跨层任务按数据流阅读：

```text
view/component -> service -> mapper -> api -> entity/enum
```

常见组合：

- 新增业务页面：`component-boundary.md`、`component-react.md`、`component-style.md`、`domain-service.md`。
- 接入新接口：`domain-api.md`、`domain-mapper.md`、`domain-service.md`。
- 调整后端字段：`domain-mapper.md`、`domain-entity.md`、必要时补读 `domain-api.md`。
- 新增可复用组件：`component-boundary.md`、`component-react.md`、`component-style.md`。
- 提交或写 PR：`commit.md`。

## 五、收敛约定

新增代码必须遵循本目录描述的最终形态；修改旧代码时，只收敛与当前任务相关的部分，不做无关大重构。
