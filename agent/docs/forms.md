# 表单设计与实现规范

本规范适用于登录、注册、设置、资源编辑器和所有含可提交字段的弹窗。表单的目标是让用户清楚知道要填写什么、何时会看到错误、离开时会发生什么；不是把页面结构、业务对象和实现细节同时展示给用户。

## 硬性约束

- 默认不写说明。字段标签、控件类型和操作名称已经表达的内容，不再换一句话重复。
- `FormField` 不提供常驻 `description`；`AppForm.Section` 和 `AppForm.Row` 也不提供常驻说明。解释只能通过 `FieldHelp` 按需查看，或由真实错误承载。
- 问号不是“把废话藏起来”的容器。若说明只是在复述标签、解释显然操作或描述内部实现，直接删除。
- 不解释业务流程、对象关系、后端实现和不存在的配置项。用户不能据此做决定的信息不进入界面。
- 占位符已经给出的格式、长度和示例不得在 `FieldHelp` 中重复；两者冲突时，先收敛占位符，不能再用问号追加同义说明。
- 新增表单说明默认在 Review 中拒绝。作者必须指出具体误解风险，不能用“更清楚”“更友好”“提升体验”作为理由。
- 一个说明能通过长度缩减变成标签，就改标签，不保留说明。
- 错误只在真实发生时出现，并说明如何修正。不要把未来可能发生的注意事项常驻在表单里。

## 一、职责分层

表单能力按稳定契约拆分，禁止把所有行为塞进一个 `AppForm`：

| 能力                               | 唯一入口                                                                               | 责任                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 字段结构、标签、必填态、错误和帮助 | [`FormField`](../../src/components/base/Input/FormField/index.tsx)                     | 组合标签、控件、错误与按需帮助，不承载常驻说明     |
| 长表单分区与锚点导航               | [`AppForm`](../../src/components/base/AppForm/index.tsx)                               | `Section`、`Rows`、`Row`、`AnchorNav` 的版式与导航 |
| 问号帮助入口                       | [`FieldHelp`](../../src/components/base/FieldHelp/index.tsx)                           | 使用圆形问号图标，通过悬浮或键盘聚焦展示说明       |
| 客户端校验时机                     | [`useFormValidation`](../../src/hooks/useFormValidation.ts)                            | 管理值、错误、触碰状态和提交后持续校验             |
| 路由与浏览器离开保护               | [`useUnsavedChangesGuard`](../../src/hooks/useUnsavedChangesGuard.ts)                  | 同时接入 SPA 路由阻断和 `beforeunload`             |
| 离开决策弹窗                       | [`UnsavedChangesDialog`](../../src/components/business/UnsavedChangesDialog/index.tsx) | 继续编辑、放弃并离开或保存并离开                   |

`AppForm` 是长表单外壳，不是表单数据模型。短表单直接使用 HeroUI `Form` + `FormField`；只有出现分区、锚点或设置行时才引入 `AppForm`。资源编辑器的保存、退出协商和版本状态仍由 Editor Runtime 拥有，不在页面重复实现。

## 二、字段信息层级

每个字段只按以下顺序表达信息：

1. 标签说明“填什么”。
2. 占位符只给出格式示例，不替代标签。
3. 真实错误说明“哪里不对、怎么改”。
4. 确实无法从标签推断且会导致错误选择的解释使用 `FieldHelp`。
5. 除此之外不显示任何说明。

以下文案无条件删除：

- 复述字段名或页面标题的说明。
- “填写后会保存”“从列表中选择”等显然行为。
- 供应商、协议族、后端接口、映射层等工程实现细节。
- 为不存在的配置项解释“为什么没有此开关”。
- “删除会……”这类用户已经从操作和确认弹窗知道的后果。
- “设置课程周期与每周实际授课安排”这类直接复述界面分区的句子。

比例总和、字段之间的关系和业务统计只有被后端契约定义为不可提交条件时才能成为阻断校验；没有证据时，它们最多是中性统计，不能显示警告或阻止保存。

```tsx
<FormField
  label={t('register.passwordLabel')}
  help={{
    label: t('common.passwordRulesHelp'),
    content: t('common.passwordRules'),
  }}
  value={value}
  onChange={setValue}
>
  <PasswordInput />
</FormField>
```

`FieldHelp` 只用于“不看会选错”的信息，例如密码规则、显式覆盖策略、Prompt 字段用途。常见名称、邮箱、标题、简介、时间、地点、开关布尔值默认不需要问号。`FieldHelp` 必须提供可访问名称；问号图标可由鼠标悬浮、键盘聚焦和触屏点击到达，不能只用 `title` 属性。

## 三、校验时机

统一使用以下时机，禁止在用户首次输入每个字符时立即显示完整规则错误：

| 事件                         | 行为                             |
| ---------------------------- | -------------------------------- |
| 首次输入且字段未触碰、未提交 | 不显示错误，保持中性             |
| 空字段失焦                   | 不显示错误，保持中性             |
| 已填写但无效的字段失焦       | 显示首个可修复错误               |
| 已失焦字段继续输入           | 实时重算，修正后立即消除错误     |
| 提交被拒绝后                 | 所有字段持续校验，直到修正或离开 |
| 服务端返回字段错误           | 映射到对应字段并保留用户输入     |
| 异步提交中                   | 防止重复提交；不要假称成功       |

短表单使用 `useFormValidation`，密码和确认密码等联动字段通过 `dependentFields` 重新校验。大编辑器需要把字段错误显示在对应分区，并在保存失败时保留当前输入和滚动位置。

```tsx
const validation = useFormValidation<FormValues, FormFieldName>({
  initialValues,
  fields: ['name', 'term'],
  validateField: (field, values) => validators[field](values),
});

<FormField
  label={t('fields.name')}
  value={validation.values.name}
  onChange={(value) => validation.changeField('name', value)}
  onBlur={() => validation.blurField('name')}
  errorMessage={validation.errors.name}
  isRequired
>
  <Input />
</FormField>;
```

不要在 JSX 内临时维护另一套 `touched`、`submitted` 或字段错误状态。校验函数应返回可操作的中文说明；未知后端契约时先确认，不用前端 fallback 掩盖。

## 四、离开保护

只要表单存在未保存改动，就必须同时处理：

- 应用内路由、侧栏链接、浏览器前进后退。
- 刷新、关闭窗口和离开当前站点。
- 保存中或同步中的 pending work。

普通脏表单使用 `useUnsavedChangesGuard(true)`，渲染 `UnsavedChangesDialog`。可以保存后离开时提供“保存并离开”；不能保证保存成功时提供“继续编辑”和“放弃并离开”。保存失败后回到表单并保留输入。

资源编辑器和 Agent 编辑器使用 Editor Runtime 的 `hasUnsavedChanges`、`pendingWork`、`warnBeforeUnload` 与 `prepareDraftExit`，不要在编辑器内部另建一套导航守卫。

离开弹窗不得只依赖 Toast。Toast 既不适合承载决策，也无法阻止导航。

## 五、排版层级

字号变量定义在 [`fonts.css`](../../src/styles/theme/fonts.css)，编号必须单调变化：

| 角色                   | Token                   | 当前值 |
| ---------------------- | ----------------------- | ------ |
| 辅助最小文本           | `--font-size-2xs`       | 11px   |
| 辅助文本               | `--font-size-xs`        | 12px   |
| 紧凑标签               | `--font-size-sm`        | 13px   |
| 正文                   | `--font-size-base`      | 14px   |
| 强调正文               | `--font-size-md`        | 16px   |
| 大正文                 | `--font-size-lg`        | 18px   |
| 字段组标题             | `--font-size-heading-5` | 16px   |
| 子分区标题             | `--font-size-heading-4` | 18px   |
| 分区标题               | `--font-size-heading-3` | 20px   |
| 页面标题（紧凑工作区） | `--font-size-heading-2` | 24px   |
| 页面标题               | `--font-size-heading-1` | 28px   |

规则：

- `heading-2` 不得小于 `heading-3`，禁止再用 `calc(heading-3 + 4px)` 临时构造页面标题。
- 同一视觉角色使用同一 token；HTML 标题级别服务文档结构，视觉字号服务角色，但不得因此产生倒置层级。
- 标签、辅助文本和错误文本分别使用标签、说明、错误语义样式，不靠随机字重制造层级。

## 六、可访问性与布局

- 每个控件必须有可见标签或可靠的可访问名称。
- 必填态、错误态和帮助入口必须暴露给辅助技术。
- 错误文本与字段关联；提交失败后不能只弹 Toast。
- 帮助图标有至少 24px 的可交互区域，并提供键盘焦点态。
- 长表单保留分区锚点；窄屏仍可顺序完成全部字段。
- 控件、粘贴内容和长标签在 200% 缩放、窄屏与长文本下不得重叠或截断关键内容。
- 明确 `Enter`、提交按钮和自动保存边界；自动保存页面不要同时伪装成显式提交表单。

## 七、实现检查清单

- [ ] 字段标签直接说明内容，没有复述型说明。
- [ ] 没有常驻字段说明；`FormField`、`AppForm.Section`、`AppForm.Row` 未传 `description`。
- [ ] `FieldHelp` 只用于不解释就会选错的信息，不是常规排版元素。
- [ ] 首次输入不触发完整规则报红。
- [ ] 失焦和提交错误就近显示，修正后实时消除。
- [ ] 服务端错误未用 fallback 掩盖，并保留用户输入。
- [ ] 脏表单同时接入应用内导航与浏览器离开保护。
- [ ] 保存中、保存失败、放弃和继续编辑都有明确路径。
- [ ] 标题层级仅消费语义 token，没有反向字号。
- [ ] 已用 `rg` 检查并删除不再使用的旧文案、旧状态和旧组件。
