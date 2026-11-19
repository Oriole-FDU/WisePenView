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

- `src/components/base`：不带业务语义的通用组件，包含原子层（`Modal`、`Popover`、`Dropdown`、`ListBox`、`Tabs`、`DeferredContent`）、基础控件（`Button`、`Input`、`Table`、`Tree`、`Chart`、`Markdown`、`Feedback`、`Icons`、`Avatar`、`Rating`、`StepDots`、`QuotaBar`）和只提供结构的 App 级外壳（`AppModal`、`AppPopover`、`AppBanner`、`AppBreadcrumb`）。
- `src/components/business`：绑定业务语义但跨页面复用的组件，包含语义弹窗（`AppAlertDialog`、`AppFormDialog`、`AppDisplayDialog`、`UnsavedChangesDialog`）、工作区面板骨架（`WorkspacePanel`）和领域块（`Chat`、`Drive`、`Group`、`Resource`、`ModelSelector` 等）。
- `src/components/editors`：资源编辑器层。六种编辑器（`agent`、`drawio`、`note`、`office`、`pdf`、`skill`）通过 `editor.type` 的契约与宿主通信，`_runtime` 负责快照上报、退出协商与展示信息绑定，`ResourceEditor` 按 `EditorTarget` 从 `editorRegistry` 分发并挂载编辑器。资源外壳（`ResourceLayout`、`ResourceLayoutHeader`、`ResourceToolbar`）属于资源布局，位于 `src/layouts/Resource/ResourceLayout/`；资源互动面板属于 `components/business/Resource`。`ResourceEditorWorkspace` 组合资源外壳、互动面板与 `ResourceEditor`，`ResourceWorkspacePresentation` 独立订阅展示信息并通过 `WorkspacePanelPortal` 把划词批注和互动内容送入统一右栏；`ResourceTargetResolver` 按资源和编辑器类型设置 key，隔离工作区生命周期。资源视图的三个平级右栏内容由 `src/views/app/resource/ResourceRouteBoundary` 统一组合，纯布局 `src/layouts/WorkspaceRightPanelLayout` 只负责唯一右侧槽位、宽度和容器结构（课程学习页同样复用该布局）。编辑器只上报领域展示信息，不持有宿主布局，也不判断顶栏／侧栏内容。
  - 加载入口通过 `useEditorLoadState` 只上报请求 loading/error；活动领域会话通过 `useEditorRuntime` 注册完整 `EditorSnapshot` 和退出策略，注销时一起失效并中止等待。入口刷新失败应保留已加载会话和草稿，首次加载失败才进入错误页；旧会话的更新与注销不得覆盖新会话。
  - `EditorResourcePresentation` 是编辑器与资源工具栏共用的展示契约，布局只补充面包屑和外部动作。展示更新直接替换上报，绑定卸载时只清理最后一次上报；Portal 的 Context 仍归编辑器会话。
  - Office 从 SDK 就绪、修改和错误事件建立完整快照，退出等待修改送达编辑服务，不宣称已写回业务存储；Draw.io 的保存与退出业务规则见 [Draw.io workflow](../../src/components/editors/drawio/BUSINESS.md)。嵌入编辑器容器身份取自 EditorSurface，不读取 ResourceHost Context。
- `src/components/_shadcn`：第三方与生成态基础组件，保持独立目录，不放业务逻辑。

依赖方向单向：`business` 与 `editors` 可以依赖 `base`，`base` 不得依赖 `business` 或 `editors`。新增组件先判断是否带业务语义，再决定落在哪一层；分层只回答“通用还是业务”，不替代“是否该留在 `src/components`”的判断。

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
│   └── style.module.scss
└── business/ComponentName/
    ├── index.tsx
    ├── index.type.ts
    └── style.module.scss
```

页面私有组件推荐：

```text
PageName/
├── index.tsx
├── style.module.scss
├── components/
├── hooks/
└── config/
```

## 六、命名与入口校验

`eslint-rules/component-conventions.js` 注册 `wisepen/component-conventions`，由 `pnpm lint` 校验组件目录、入口、导出和辅助文件命名。当前处于 warning 阶段，用于先暴露存量迁移和新代码风险，不阻塞 CI。

- 新增 React 组件必须位于 `PascalCase` 文件夹，并以 `index.tsx` 作为唯一入口；组件导出名必须是 `PascalCase`。仅在当前页面使用的私有组件也遵循同一规则。
- 组件目录名必须与 `index.tsx` 的主导出一致，例如 `OrderSummary/index.tsx` 应主导出 `OrderSummary`；不一致的历史组件登记在 `componentNames` 基线。
- 组件目录根部只放入口、公共类型和样式等稳定模块文件。逻辑、Hook 和 helper 放在组件目录下的 `hooks/`、`controllers/`、`utils/` 等分组目录，或使用 `camelCase.ts` 直接放在组件目录根部。
- 组件公共类型拆出时统一使用 `index.type.ts`；单个组件私有样式拆出时统一使用 `style.module.scss`。项目使用 SCSS CSS Modules，因此不以 `index.css` 作为组件样式契约。类型和样式文件按实际需要创建，不生成空占位文件。
- `index.ts`、`index.type.ts`、`style.module.scss`、`*.stories.tsx`、`*.test.tsx` 和 `*.spec.tsx` 是保留文件名；组件实现不能继续使用同级 `Foo.tsx`。
- `_components`、`components`、`hooks`、`controllers`、`utils`、`_context`、`_store` 等小写分组目录只承载组织或逻辑；分组内若新增组件，仍须下沉到 `PascalCase/index.tsx`。
- 存量扁平组件、目录与导出名不一致和技术入口登记在 `eslint-rules/component-conventions.js` 的 `componentConventionBaseline` 中。迁移时只删除对应基线项，不把新违规追加到基线；基线为空后再删除该兼容层。
- 未登记的新 `Foo.tsx`、非 `PascalCase` 组件目录、非 `PascalCase` 组件导出、组件根部的 `PascalCase.ts` 辅助文件，以及非 `style.module.scss` 的组件私有 CSS Module 都会产生 lint warning。迁移稳定后再提升为 error。

## 七、收敛规则

- 修改组件时，若当前任务天然涉及归属边界，优先向最小复用范围收敛。
- 不要在 `components` 中继续扩大业务组件规模。
- 遇到归属不确定时，先按“最小复用范围”放置。

## 八、检查清单

- [ ] 新组件放置位置符合复用范围。
- [ ] 新组件使用 `PascalCase/index.tsx`，主导出为 `PascalCase`。
- [ ] 组件目录根部没有新增 `Foo.tsx`、`Foo.module.scss` 或 `Foo.type.ts`。
- [ ] 拆出的公共类型和私有样式分别使用 `index.type.ts` 与 `style.module.scss`。
- [ ] 新组件落在 `base` 或 `business` 的正确一层，`base` 没有反向依赖 `business`。
- [ ] 业务组件没有无理由进入 `src/components`。
- [ ] 组件 Props 没有承载整条业务链路。
- [ ] 通用展示组件不隐式依赖业务 service。
- [ ] 业务容器组件通过 `useXxxService()` 获取能力。
