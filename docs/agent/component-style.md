# 样式与 UI 规范

WisePenView 使用 Less、CSS Modules 和 HeroUI。新增代码都应遵循 HeroUI 风格与项目现有设计语言。

## 一、样式组织

- 样式使用 Less + CSS Modules。
- 组件样式文件命名为 `style.module.less`。
- 样式类名使用 camelCase。
- 避免非必要内联样式。
- 动态样式优先通过 className、CSS 变量或组件受控属性表达。

推荐结构：

```text
ComponentName/
├── index.tsx
├── index.type.ts
└── style.module.less
```

## 二、HeroUI 使用

- Button、Input、Select、Checkbox 等基础交互控件使用 HeroUI 或项目已有封装。
- Modal 类业务浮层使用项目 `Overlay` 封装；只有封装组件本身和明确记录过的特殊浮层可以直接使用底层 `Modal` / `AlertDialog`。

## 三、Modal 约定

新增业务弹窗按语义选择封装：只需要用户在“继续/取消”之间做明确决策的 yes/no 弹窗使用 `src/components/Overlay/AppAlertDialog`，主体可以包含补充说明或只读列表；只有 `Input` 或 `InputOTP` 的输入型弹窗使用 `src/components/Overlay/AppFormDialog`，结构遵循 HeroUI 的 Modal with form 写法，由 `Modal.Dialog` 内的 `Form` 统一处理提交；展示只读内容、二维码、服务协议、iframe、邀请码、成功结果等非任务型内容使用 `src/components/Overlay/AppDisplayDialog`，主操作只表达“关闭、复制、打开、前往”等后续动作；带选择、上传、勾选、文本域、复杂编辑或延迟内容的业务弹窗使用 `src/components/Overlay/AppModal` 作为可定制起点。`AppModal` 不承担确认、危险、提交、提示 banner 等具体任务语义，只统一 Modal 外壳、标题、body/footer slot 和 `DeferredContent` 延迟渲染能力；业务弹窗不要直接使用底层 `@/components/Overlay` Modal、`@heroui/react` Modal 或 `@heroui/react` AlertDialog，除非弹窗是高度定制的 command palette、无标准 header/footer 的轻浮层，且在代码旁说明原因。

- 受控属性使用 `isOpen` 和 `onOpenChange`。
- 关闭弹窗调用 `onOpenChange(false)`。
- 纯输入弹窗使用 `AppFormDialog`，提交逻辑放在 `onSubmit`，确认按钮由组件渲染为 `type="submit"`。
- 展示型弹窗使用 `AppDisplayDialog`，不要传入确认语义；需要按钮时优先使用 `primaryAction` / `secondaryAction` 表达复制、跳转、关闭等动作。
- 任务型 `AppModal` 的按钮使用 `actions` 或 `footer` 显式传入，不要让 `AppModal` 推断确认/取消语义。
- yes/no 决策弹窗使用 `AppAlertDialog`，普通确认使用 `type="confirm"`，危险操作使用 `type="danger"`。
- 业务弹窗不要自行给 modal header/footer 添加 divider、`border-top` 或 `border-bottom`。
- 操作成功后通常先调用 `onSuccess?.()`，再关闭弹窗。
- 异步提交使用 `useRequest(fn, { manual: true })`。
- 错误提示使用 HeroUI `toast` 和 `parseErrorMessage(err)`。

## 四、Popover 约定

- 业务 Popover 使用 `src/components/Overlay/AppPopover`，不要直接组合底层 `Popover.Content` / `Popover.Dialog`。
- 标准标题通过 `AppPopover.Content` 的 `title` 传入；无标题轻浮层省略 `title`，两者共用同一内容间距。
- 危险提示型 Popover 使用 `variant="danger"`；Dropdown 中的删除、退出等危险操作使用 `Dropdown.Item variant="danger"`。
- 宽度、最大高度等业务布局通过 `className` 保留在调用方，不重复设置边框、圆角、背景或阴影。
- 内容已有完整内边距或为第三方面板时使用 `bodyPadding="none"`，避免双层间距。

## 五、布局与可读性

- 页面和工具界面优先清晰、紧凑、可扫描。
- 不要为了装饰创建过多卡片嵌套。
- 固定格式 UI 需要稳定尺寸，例如表格、工具栏、图标按钮、计数器。
- 文本不能溢出容器或互相遮挡。
- 不要使用纯装饰性渐变球、光斑、无意义背景图。
- 不要用 viewport 宽度直接缩放字体。

## 六、组件库使用

- 图标按钮优先使用已有图标库，例如 `lucide-react`。
- 有明确图标语义时，不要用文字按钮代替图标按钮。
- 纯图标按钮统一使用 `AppIconButton`，必须同时提供 hover/focus tooltip 和可访问名称；不要用 `title` 代替 tooltip。
- 带有清晰可见文字的按钮不重复显示同义 tooltip；截断文本、禁用原因或复杂状态按需提供 tooltip。
- `AppIconButton` 的 hover 背景统一为圆角方形，业务样式不得覆盖其圆角；圆形控件仅用于头像、状态点等本身具有圆形语义的元素。
- `AppIconButton` 作为 Popover、Dropdown 等浮层触发器时，通过 `overlayTrigger` 组合，不在调用点重复拼装 Tooltip 或设置 `tooltip={false}`。
- Tooltip 方向由所在控件组统一决定，不由单个按钮随意选择：顶部工具栏向下、底部工具栏向上、左侧竖向工具栏向右、右侧竖向工具栏向左；同一控件组必须一致，仅在视口空间不足时允许浮层自动翻转。
- 表格、菜单、tabs、开关、滑块等控件使用符合用户预期的交互形态。

## 七、检查清单

- [ ] 样式使用 Less + CSS Modules。
- [ ] 没有非必要内联样式。
- [ ] 交互控件使用 HeroUI 或项目已有封装。
- [ ] 文本和控件在常见宽度下不会重叠或溢出。
- [ ] 没有无意义装饰和卡片套卡片。
