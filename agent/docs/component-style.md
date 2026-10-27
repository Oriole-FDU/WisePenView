# 样式与 UI 规范

WisePenView 使用 SCSS、CSS Modules 和 HeroUI，保留原生 CSS 作為主題 token 與全域樣式入口。新增代码都应遵循 HeroUI 风格与项目现有设计语言。

## 一、样式组织

- 元件使用 SCSS + CSS Modules，檔名為 `style.module.scss`；不得新增 Less 來源、匯入或直接編譯相依。
- 使用 Vite 原生支援的 `sass-embedded`，以具名 namespace 的 `@use` 引用共用定義，不使用 Sass `@import`、`@extend` 或 `additionalData` 隱式注入。
- 共用 `_*.scss` partial 只包含變數、函式與 mixin，單獨載入不得輸出 CSS；實際類別保留在所屬 CSS Module，不跨元件匯入私有樣式，不以 `@extend` 取代 mixin 或 CSS Modules composition。
- 样式类名使用 camelCase。
- 避免非必要内联样式。
- 动态样式优先通过 className、CSS 变量或组件受控属性表达。
- 全局样式分两份：`src/styles/global/index.css` 提供 token、排版与基础重置，应用和 Storybook 预览共用；桌面端外壳约束（`html`/`body` 占满视口、整页不滚动、`#root` 接管滚动与选区）放在 `src/styles/global/app-shell.css`，只有应用入口引入，否则 Storybook 预览与 Docs 页面会被裁掉且无法滚动。
- 间距单位、`--space-*` 刻度和页面／输入区／表格间距集中在 `src/styles/theme/spacing.css`；`gap`、`margin`、`padding` 在数值命中公共刻度时必须消费对应 token。
- 字体、字号、字重和行高变量集中在 `src/styles/theme/fonts.css`，其他 token 文件不再重复定义；全局排版应用规则仍由 `src/styles/global/index.css` 消费这些变量。

推荐结构：

```text
ComponentName/
├── index.tsx
├── index.type.ts
└── style.module.scss
```

## 二、HeroUI 使用

- Button、Input、Select、Checkbox 等基础交互控件使用 HeroUI 或项目已有封装。
- Modal 类业务浮层使用项目浮层封装（`src/components/base/AppModal` 与 `src/components/business/App*Dialog`）；只有封装组件本身和明确记录过的特殊浮层可以直接使用底层 `Modal` / `AlertDialog`。

## 三、Modal 约定

新增业务弹窗按语义选择封装：只需要用户在“继续/取消”之间做明确决策的 yes/no 弹窗使用 `src/components/business/AppAlertDialog`，主体可以包含补充说明或只读列表；只有 `Input` 或 `InputOTP` 的输入型弹窗使用 `src/components/business/AppFormDialog`，结构遵循 HeroUI 的 Modal with form 写法，由 `Modal.Dialog` 内的 `Form` 统一处理提交；展示只读内容、二维码、服务协议、iframe、邀请码、成功结果等非任务型内容使用 `src/components/business/AppDisplayDialog`，主操作只表达“关闭、复制、打开、前往”等后续动作；带选择、上传、勾选、文本域、复杂编辑或延迟内容的业务弹窗使用 `src/components/base/AppModal` 作为可定制起点。`AppModal` 不承担确认、危险、提交、提示 banner 等具体任务语义，只统一 Modal 外壳、标题、body/footer slot 和 `DeferredContent` 延迟渲染能力；业务弹窗不要直接使用底层 `@/components/base/Modal`、`@heroui/react` Modal 或 `@heroui/react` AlertDialog，除非弹窗是高度定制的 command palette、无标准 header/footer 的轻浮层，且在代码旁说明原因。

- 受控属性使用 `isOpen` 和 `onOpenChange`。
- 关闭弹窗调用 `onOpenChange(false)`。
- 纯输入弹窗使用 `AppFormDialog`，提交逻辑放在 `onSubmit`，确认按钮由组件渲染为 `type="submit"`。
- 展示型弹窗使用 `AppDisplayDialog`，不要传入确认语义；需要按钮时优先使用 `primaryAction` / `secondaryAction` 表达复制、跳转、关闭等动作。
- 任务型 `AppModal` 的按钮使用 `actions` 或 `footer` 显式传入，不要让 `AppModal` 推断确认/取消语义。
- yes/no 决策弹窗使用 `AppAlertDialog`，普通确认使用 `type="confirm"`，危险操作使用 `type="danger"`。
- 业务弹窗不要自行给 modal header/footer 添加 divider、`border-top` 或 `border-bottom`。
- 操作成功后通常先调用 `onSuccess?.()`，再关闭弹窗。
- 异步提交使用 `useApi(fn, { manual: true })`。
- 错误提示使用 HeroUI `toast` 和 `parseErrorMessage(err)`。

## 四、Popover 约定

- 操作菜单、单选和多选 Picker 使用 `@heroui/react` 的 `Dropdown`，复用其原生分组、标题、描述、选择指示器、危险态和子菜单能力。
- 业务 Popover 使用 `src/components/base/AppPopover`，不要直接组合底层 `Popover.Content` / `Popover.Dialog`。
- 标准标题通过 `AppPopover.Content` 的 `title` 传入；无标题轻浮层省略 `title`，两者共用同一内容间距。
- 危险提示型 Popover 使用 `variant="danger"`；菜单中的删除、退出等危险操作使用 `Dropdown.Item variant="danger"`。
- 宽度、最大高度等业务布局通过 `className` 保留在调用方，不重复设置边框、圆角、背景或阴影。
- 内容已有完整内边距或为第三方面板时使用 `bodyPadding="none"`，避免双层间距。
- 菜单标题和分组使用 `Header`、`Dropdown.Section`，分割线使用 `Separator`；不要为这些原生能力再创建业务 wrapper。

## 五、布局与可读性

- 页面和工具界面优先清晰、紧凑、可扫描。
- 不要为了装饰创建过多卡片嵌套。
- 固定格式 UI 需要稳定尺寸，例如表格、工具栏、图标按钮、计数器。
- 文本不能溢出容器或互相遮挡。
- 不要使用纯装饰性渐变球、光斑、无意义背景图。
- 不要用 viewport 宽度直接缩放字体。

间距按“基础单位 → 公共刻度 → 应用语义”组织，统一定义在 `src/styles/theme/spacing.css`：

| 层级     | Token                                                                                       | 使用范围                              |
| -------- | ------------------------------------------------------------------------------------------- | ------------------------------------- |
| 基础单位 | `--spacing`                                                                                 | Tailwind 与 HeroUI 的间距计算基准     |
| 公共刻度 | `--space-3xs` 至 `--space-3xl`                                                              | `gap`、`margin`、`padding` 的通用间距 |
| 应用语义 | `--app-page-padding-*`、`--chat-input-*-padding-*`、`--table-*-gap` / `--table-*-padding-*` | 页面、输入区、表格和浮层的统一间距    |

- `gap`、`margin`、`padding` 的数值命中公共刻度时必须引用 `var(--space-*)`，不得重复写 `2px`、`4px`、`8px`、`12px`、`16px`、`24px`、`32px` 等刻度值。
- 局部光学修正、字符对齐或无法由公共刻度表达的组件布局常量可以保留字面量；同类场景重复出现时，应在 `spacing.css` 补充应用语义 token。
- 运行时会覆盖的响应式间距应写入 token 引用，不直接写入 `8px`、`24px` 等固定值。
- `pnpm check:spacing` 在 CI 拦截未定义的 `--space-*` 引用、错误的刻度定义位置，以及组件中硬编码公共刻度的间距声明。

## 六、圆角层级

圆角按“8px 基准 → 基础圆角 → 应用圆角”单向定义，三层变量集中在 `src/styles/theme/radius.css`，其他 token 文件不再定义圆角；规范示例 story 放在 `src/styles/_stories/Radius.stories.tsx`。后续新增其他 token 家族时沿用同一形态（基准、刻度、应用语义三层，一处源头）。

基准圆角（`--radius`）和基础圆角（`--radius-xs` 到 `--radius-4xl`）只是把数值参数化，不表达业务含义，组件与业务样式不得直接引用；组件与业务样式只使用应用圆角，缺少匹配语义时先在应用层补 token。

| 语义         | Token                                                        | 当前值      | 使用范围                                                                                             |
| ------------ | ------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------- |
| 装饰细节     | `--app-radius-detail`                                        | 2px         | 图表图例色块、Tab 指示线、行内文本高亮、分隔块                                                       |
| 行内小面     | `--app-radius-inline`                                        | 4px         | 行内 code、内联公式、嵌入预览块、骨架块                                                              |
| 勾选控件     | `--app-radius-checkbox`                                      | 4px         | Checkbox 控件本体（含表格选择框、Tree、Markdown/BlockNote 任务列表）                                 |
| 浮层内控件   | `--app-radius-popover-control`                               | 4px（派生） | 浮层内与内容 padding 对齐的操作控件，等于外壳圆角减去 `--app-popover-content-padding`                |
| 菜单项       | `--app-radius-menu-item`                                     | 6px         | Dropdown、Popover、Select 等选项                                                                     |
| 提示气泡     | `--app-radius-tooltip`                                       | 6px         | Tooltip 与图表 tooltip 的气泡本体                                                                    |
| 浮层内选中项 | `--app-radius-popover-item`                                  | 6px（派生） | 浮层内部的选中项与 hover 背景，等于外壳圆角减去选项 inset                                            |
| 字段控件     | `--app-radius-field`                                         | 8px         | Input、Select trigger、ComboBox/Autocomplete trigger                                                 |
| 按钮         | `--app-radius-button`                                        | 8px         | Button、ToggleButton、IconButton、按钮组首尾边缘                                                     |
| 内容容器     | `--app-radius-content`                                       | 8px         | 卡片、面板、表格外壳、正文内嵌块（代码块、Mermaid、拖拽预览、拖拽区）                                |
| 导航项       | `--app-radius-sidebar-item` / `--app-radius-breadcrumb-item` | 8px         | Sidebar 与 Breadcrumb 导航项                                                                         |
| 浮层         | `--app-radius-popover`                                       | 12px        | Popover、Dropdown、Select、ComboBox/Autocomplete、EmojiPicker、SlashMenu、编辑器浮动工具条与内联面板 |
| Modal        | `--app-radius-modal`                                         | 12px        | Modal、AlertDialog、FormDialog、DisplayDialog；`size="cover"` 仍是 12px 圆角，`size="full"` 保持直角 |
| 圆形语义     | `--app-radius-pill` / `--app-radius-scrollbar`               | 999px       | 头像、状态点、胶囊标签与滚动条滑块                                                                   |

表格域另有两个覆盖点：`--table-shell-radius` 指向内容容器圆角，`--table-inner-radius` 指向菜单项圆角，只做转接，不引入新数值。

规则：

- Checkbox 不得复用 `--app-radius-field`，否则 16px 控件会被裁成正圆。
- 非交互的小面按场景取 `--app-radius-detail`（装饰细节）或 `--app-radius-inline`（行内及内嵌小面）；两者与 `--app-radius-checkbox` 数值相同但语义不同，不要互相复用。
- Select 收起状态的 trigger 属于字段控件，展开后的面板是独立浮层外壳，面板内部选项取 `--app-radius-popover-item`；ComboBox、Autocomplete trigger 遵循相同拆分。
- Tooltip 的 `--app-radius-tooltip` 只作用于气泡本体；触发它的按钮或字段仍按自身语义取 token。
- 嵌套浮层按外壳半径和内容 inset 计算内层半径，状态切换（hover、selected、focus-visible）不得改变同一控件的圆角。
- Sidebar 导航项、hover 和 selected 背景使用 `--app-radius-sidebar-item`；头像、状态点、滚动条、胶囊标签等圆形语义元素使用 `--app-radius-pill`，正方形元素的整圆可以直接写 `50%`。
- 新增圆角先选择语义 token；语义 token 缺失时在 `src/styles/theme/radius.css` 的应用语义层补一个，再让组件引用。
- 组件样式不得直接引用 `--radius-*`，也不得硬编码圆角数值；需要更大或更小的几何值时报给应用语义层处理。新增语义 token 时同步更新本节表格。
- 唯一例外是第三方 iframe 等外部契约：drawio 通过 `src/components/editors/drawio/hooks/useDrawioTheme.ts` 按对方变量名透传主题，必须在代码旁注明原因；项目自有样式即使位于第三方适配目录内也不适用该例外。
- `pnpm check:radius` 在 CI 拦截上述两类写法：扫描 `src/**` 的 `.scss`/`.css`（`src/styles/**` 是 token 与基础设施层，除外），只放行 `0`、百分比整圆和 `--app-radius-*`。守衛亦能辨識誤加的 Less，但 `check:styles` 會直接拒絕該來源。

## 七、层级（z-index）

z-index 按“基准 → 基础刻度 → 应用语义”单向定义，三层变量集中在 `src/styles/theme/z-index.css`，其他 token 文件不再定义 z-index。

基准（`--z-index-base`）和基础刻度（`--z-index-1` 到 `--z-index-1200`）只是顺序轴上的位置，不表达业务含义，组件与业务样式不得直接引用；组件与业务样式只使用应用语义层级，缺少匹配语义时先在应用语义层补 token。

| 语义       | Token                                                                                          | 当前值          | 使用范围                                         |
| ---------- | ---------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------ |
| 基准层     | `--app-z-index-base`                                                                           | 0               | 文档流内容本体、被其他层覆盖的底层               |
| 相邻层     | `--app-z-index-raised` / `--app-z-index-elevated`                                              | 1 / 2           | 同一容器内的勾选标记、悬停覆盖                   |
| 吸顶层     | `--app-z-index-sticky` / `--app-z-index-sticky-raised` / `--app-z-index-sticky-header`         | 3 / 4 / 5       | 表格吸顶、分组吸顶表头                           |
| 浮起层     | `--app-z-index-floating`                                                                       | 10              | 脱离内容流但仍属于同一容器的浮层                 |
| 局部浮层   | `--app-z-index-local-overlay`                                                                  | 20              | 依附内容定位的浮层，例如块内工具栏               |
| 编辑器块内 | `--app-z-index-editor-block-overlay` / `--app-z-index-editor-block-overlay-raised`             | 25 / 30         | 表格选择高亮，以及需要盖住块内容与高亮的插入手柄 |
| 停靠层     | `--app-z-index-dock`                                                                           | 30              | 附着在窗口边缘的常驻浮层，例如编辑器待保存提示   |
| 命令层     | `--app-z-index-command`                                                                        | 50              | 全局搜索 command palette                         |
| 编辑器浮层 | `--app-z-index-editor-menu` / `--app-z-index-editor-toolbar` / `--app-z-index-editor-floating` | 180 / 220 / 450 | 编辑器菜单、格式工具栏、行内浮层                 |
| 轻浮层     | `--app-z-index-popover` / `--app-z-index-tooltip`                                              | 400 / 500       | Popover、Dropdown、Select 外壳与提示气泡         |
| 阻断层     | `--app-z-index-modal`                                                                          | 1000            | Modal、AlertDialog                               |
| 通知层     | `--app-z-index-toast`                                                                          | 1100            | Toast                                            |
| 引导层     | `--app-z-index-guide`                                                                          | 1200            | 新手引导遮罩与气泡，需盖过页面内所有常规浮层     |

规则：

- 组件与业务样式只写 `z-index: var(--app-z-index-*)`；同一容器内需要插层时写 `calc(var(--app-z-index-*) + 1)`，不改动 token 数值。
- 不写回退数值，例如 `var(--app-z-index-editor-toolbar, 220)`；数值只在 `src/styles/theme/z-index.css` 维护一处。
- 内联样式仅在定位计算需要时出现，`zIndex` 必须引用 token，不写数字字面量。
- 新增层级先选择语义 token；语义缺失时在 `src/styles/theme/z-index.css` 的应用语义层补一个，再让组件引用，并同步更新本节表格。
- `pnpm check:z-index` 在 CI 拦截上述写法：扫描 `src/**` 的 `.scss` / `.css` / `.ts` / `.tsx`（`src/styles/**` 是 token 与基础设施层，除外），样式文件只放行 `auto` 与 `--app-z-index-*`。誤加 Less 的處理同圓角守衛。

## 八、组件库使用

- 图标按钮优先使用已有图标库，例如 `lucide-react`。
- 有明确图标语义时，不要用文字按钮代替图标按钮。
- 纯图标按钮统一使用 `AppIconButton`，必须同时提供 hover/focus tooltip 和可访问名称；不要用 `title` 代替 tooltip。
- 带有清晰可见文字的按钮不重复显示同义 tooltip；截断文本、禁用原因或复杂状态按需提供 tooltip。
- `AppIconButton` 的 hover 背景统一为圆角方形，业务样式不得覆盖其圆角；圆形控件仅用于头像、状态点等本身具有圆形语义的元素。
- `AppIconButton` 保留原生按钮的事件语义；作为浮层触发器时，通过 `Dropdown.Trigger` 或 `AppPopover.Trigger<'button'>` 的 `render` 渲染它，并透传事件、ref、ARIA 属性及禁用状态，让触发器与按钮共用一个 DOM 节点。`AppButton` 已使用 HeroUI Button，可直接承接浮层上下文。Tooltip 由 `AppIconButton` 统一提供；Tooltip、菜单或 Popover 不得为同一动作创建第二个 button、role="button" 或 Tab 停靠点。禁用提示可使用无角色、不可聚焦的容器接收 hover。
- Tooltip 方向由所在控件组统一决定，不由单个按钮随意选择：顶部工具栏向下、底部工具栏向上、左侧竖向工具栏向右、右侧竖向工具栏向左；同一控件组必须一致，仅在视口空间不足时允许浮层自动翻转。
- 表格、菜单、tabs、开关、滑块等控件使用符合用户预期的交互形态。
- 弹窗 footer 的确定/取消按钮由 Overlay 组件统一控制间距，业务代码只按视觉顺序传入按钮或 actions。
- 页面级业务操作、表单提交/取消、创建/加入等并排文字按钮保持独立按钮，用 flex 容器和语义间距 token 排布，不使用会形成胶囊样式的 `ButtonGroup`。
- 只有同一工具栏内的紧密图标按钮、强关联分段操作或显式 toggle 场景使用 `ButtonGroup` / `ToggleButtonGroup`。
- 禁止用 `gap: 8px`、`marginLeft`、`marginRight` 等硬编码手动控制按钮间距；弹窗 footer 间距使用 `var(--space-sm, 12px)`。

## 九、检查清单

- [ ] 元件樣式使用 SCSS + CSS Modules，共用 partial 單獨載入不輸出 CSS，無 Less 來源與引用。
- [ ] 没有非必要内联样式。
- [ ] 交互控件使用 HeroUI 或项目已有封装。
- [ ] 文本和控件在常见宽度下不会重叠或溢出。
- [ ] 层级使用应用语义 token，没有数字 z-index 和回退数值。
- [ ] 没有无意义装饰和卡片套卡片。
