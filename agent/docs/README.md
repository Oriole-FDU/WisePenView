# WisePenView Agent 文档

这些文档是 WisePenView 的架构和编码规范。它们按任务类型渐进式读取，不要在每个任务开始时一次性打开全部文件。

## 入口

- 常驻入口：仓库根目录 `AGENTS.md`
- AI 开发基建说明：`agent/README.md`
- 验证矩阵：`agent/docs/verification.md`
- 提交规范：`agent/docs/commit.md`
- 发布与分支：`agent/docs/release.md`

## Domain 任务

- `domain-api.md`：API 薄层、DTO 和请求边界。
- `domain-mapper.md`：按需映射、fallback、协议兼容和归一化。
- `domain-service.md`：Service 编排、依赖注入和错误处理。
- `domain-entity.md`：Entity、Enum、常量和类型边界。

推荐顺序：`domain-service.md -> domain-mapper.md -> domain-api.md -> domain-entity.md`。

## Component 与 View 任务

- `architecture-guidelines.md`：ESLint 文件长度告警、拆分决策、目录归属与高内聚低耦合。
- `component-boundary.md`：组件放置、复用范围和 base/business 边界。
- `component-react.md`：React、Hooks、JSX、TypeScript 和副作用治理。
- `context.md`：Context 的组成、归属、Provider 和消费规范。
- `component-controller.md`：复杂组件和 Controller 拆分。
- `component-style.md`：Less、CSS Modules、HeroUI 和样式规则。
- `overlay.md`：弹层触发、焦点和可访问性边界。

## 其它领域

- `business-knowledge.md`：业务知识文件的唯一来源、迁移和分批审查。
- `routing.md`：URL、页面级 Tab、面包屑和导航历史。
- `store.md`：状态归属、注册、持久化和生命周期。
- `color-system.md`：颜色阶、语义 token 和主题。

跨层任务按 `view/component -> service -> api -> entity/enum` 读取，存在字段转换时再读 `domain-mapper.md`；涉及拆分时先读 `architecture-guidelines.md`，涉及业务知识时再读 `business-knowledge.md`。修改完成后删除旧实现和无效兼容层。
