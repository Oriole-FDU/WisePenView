# Component 与 View 边界规范

`src/components` 只承载真正可复用组件；业务相关组件放在对应 `src/views` 页面目录内。

## 一、components 放什么

`src/components` 适合放：

- 跨页面复用的基础组件。
- 与具体业务弱绑定的通用 UI，例如 Table、通用上传区、通用展示控件。
- 能形成稳定契约、可被多个 view 组合使用的组件。

`src/components` 不应新增：

- 只服务单个页面的业务块。
- 强依赖某个路由参数或页面上下文的组件。
- 把后端字段、页面跳转、权限分支都写死的组件。
- 为了“拆文件”而抽出的伪公共组件。

## 二、base 与 business 分层

`src/components` 内部按“是否绑定业务语义”分为两层：

- `src/components/base`：不带业务语义的通用组件，包含原子层（`Modal`、`Popover`、`DeferredContent`）、基础控件（`Button`、`Input`、`Table`、`Tree`、`Chart`、`Markdown`、`Feedback`、`Icons`、`Avatar`、`Rating`、`StepDots`、`QuotaBar`）和只提供结构的 App 级外壳（`AppModal`、`AppPopover`、`AppBanner`、`AppBreadcrumb`）。
- `src/components/business`：绑定业务语义但跨页面复用的组件，包含语义弹窗（`AppAlertDialog`、`AppFormDialog`、`AppDisplayDialog`、`UnsavedChangesDialog`）和领域块（`ChatPanel`、`Drive`、`Note`、`Skill`、`Group`、`Resource`、`PdfViewer`、`ModelSelector` 等）。
- `src/components/_shadcn`：第三方与生成态基础组件，保持独立目录，不放业务逻辑。

依赖方向单向：`business` 可以依赖 `base`，`base` 不得依赖 `business`。新增组件先判断是否带业务语义，再决定落在哪一层；分层只回答“通用还是业务”，不替代“是否该留在 `src/components`”的判断。

## 三、业务组件下沉到 views

业务相关 UI 优先放在对应页面或页面域目录：

```text
src/views/app/<domain>/<PageName>/
src/views/admin/<PageName>/
```

仅当前页面使用的弹窗、表单块、列表块、配置文件和私有 hook，应放在页面目录内。只有出现明确跨页面复用需求时，再提升到 `src/components`。

## 四、组件传参原则

- 组件应尽可能少传参，避免 props drilling。
- 业务容器组件需要数据时，通过 `useXxxService()` 或领域 hook 自己获取。
- 真正通用的展示组件通过 Props 接收展示数据和回调，不隐式依赖业务 service。
- 不要把 service 层 DTO 或后端 raw response 直接作为 Props 传递。

判断方式：

- 如果组件离开当前页面就失去意义，放在 `views`。
- 如果组件依赖某个业务 service 才能工作，但跨多个页面复用，允许放在 `components/business/<Domain>`，并在组件内部通过 DI 获取 service。
- 如果组件只是展示数据，不需要知道业务来源，放在 `components` 更合适。

## 五、目录结构

可复用组件推荐：

```text
components/
├── base/ComponentName/
│   ├── index.tsx
│   ├── index.type.ts
│   └── style.module.less
└── business/ComponentName/
    ├── index.tsx
    ├── index.type.ts
    └── style.module.less
```

页面私有组件推荐：

```text
PageName/
├── index.tsx
├── style.module.less
├── components/
├── hooks/
└── config/
```

## 六、收敛规则

- 修改组件时，若当前任务天然涉及归属边界，优先向最小复用范围收敛。
- 不要在 `components` 中继续扩大业务组件规模。
- 遇到归属不确定时，先按“最小复用范围”放置。

## 七、检查清单

- [ ] 新组件放置位置符合复用范围。
- [ ] 新组件落在 `base` 或 `business` 的正确一层，`base` 没有反向依赖 `business`。
- [ ] 业务组件没有无理由进入 `src/components`。
- [ ] 组件 Props 没有承载整条业务链路。
- [ ] 通用展示组件不隐式依赖业务 service。
- [ ] 业务容器组件通过 `useXxxService()` 获取能力。
