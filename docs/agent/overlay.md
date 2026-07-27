# Overlay 组件规约

## 为什么可以放在 docs/agent

`docs/agent` 下的 Markdown 不参与运行时构建，也不会被 Vite 打包。对协作代理来说，这类文档也是按需读取的上下文：只有处理相关任务、或者被明确引用时才需要打开。因此这里可以沉淀 Overlay 的设计判断，而不用把规则塞进组件接口里。

## 分层

Overlay 相关组件统一放在 `src/components/Overlay` 下。

当前分层是组合关系，不是继承关系：

```txt
Modal
├─ AppAlertDialog
├─ AppFormDialog
├─ AppDisplayDialog
└─ AppModal

Popover
└─ AppPopover
```

- `Modal` 是底层 Overlay 原子组件。
- `AppAlertDialog`、`AppFormDialog`、`AppDisplayDialog`、`AppModal` 都直接组合 `Modal`。
- 四个 App 级组件之间不应互相继承，也不应让 `AppAlertDialog` / `AppFormDialog` / `AppDisplayDialog` 基于 `AppModal` 实现。
- `Popover` 是延迟挂载原子层，`AppPopover` 统一业务 Popover 的 Content、Dialog、header、无 header body 和 danger 视觉。

原因是 `AppModal` 现在只表示“复杂业务浮层的可定制起点”。如果其他语义组件基于它实现，`AppModal` 很容易重新变成承载 confirm、form、display、danger、banner 等语义的超级组件。

## AppPopover

业务代码使用 `AppPopover`，不直接使用底层 `Popover` 或 `@heroui/react` 的 `Popover`。标准标题通过 `AppPopover.Content title` 传入；无标题内容直接传 children。调用方只保留宽度、最大高度和滚动等业务布局，边框、圆角、阴影和内容间距由 `AppPopover` 统一。

`AppPopover` 的 `variant="danger"` 用于整个浮层承载危险提示的场景；菜单中的单个危险操作仍使用 HeroUI 的 `Dropdown.Item variant="danger"`。

LaTeX 编辑浮层因依赖编辑器选区和手工测量位置，不迁移 HeroUI 的定位状态，但复用 `AppPopover.Header` 以及相同的表面 token。

## 组件边界

### AppAlertDialog

用于需要用户明确确认的操作，尤其是危险、不可逆或高打断场景。

典型业务：

- 删除文件、删除成员、删除会话。
- 退出小组、解散小组。
- 丢弃未保存修改。

### AppFormDialog

用于轻量表单提交。

典型业务：

- 新建文件夹。
- 重命名。
- 验证码输入。
- 充值、注册、找回密码等短流程表单。

### AppDisplayDialog

用于展示型内容。

典型业务：

- 二维码。
- 服务协议、隐私协议。
- iframe 预览。
- 邀请码、邀请链接。

这类内容通常只需要关闭、复制、打开外链等轻动作，不应使用确认弹窗语义。

### AppModal

`AppModal` 是可定制的复杂业务浮层起点，只提供通用浮层结构。

它不提供：

- `type="confirm"` / `type="danger"` 等业务类型。
- 内置确认、取消按钮。
- `confirmText` / `cancelText` / `onConfirm` / `onCancel`。
- `bannerTitle` / `bannerDescription` / `banner`。
- 任何危险态、确认态或展示态语义。

调用方需要自己传入：

- `actions`：简单 footer 操作。
- `footer`：完全自定义 footer。
- `children`：业务内容。
- `AppModal.Body` / `AppModal.Footer`：复杂结构时的显式组合。

## AppModal 使用场景

这些场景没有归到 `AppAlertDialog`、`AppFormDialog`、`AppDisplayDialog`，因为它们承载复杂业务流程、复杂选择器、上传队列或组合内容。

| 文件                                                                        | 业务                                         |
| --------------------------------------------------------------------------- | -------------------------------------------- |
| `src/components/Drive/Modals/DriveCreateModal/index.tsx`                    | 创建 Agent、Skill，多字段输入和描述编辑。    |
| `src/views/workspace/note/_components/NotePermissionModal/index.tsx`        | 笔记权限配置，权限模式、用户选择、保存。     |
| `src/views/app/profile/_components/Account/AccountHeader/index.tsx`         | 更换头像，上传图片并保存。                   |
| `src/views/app/profile/_components/Account/AccountVerification/index.tsx`   | 账号验证发起，邮箱/UIS tabs 表单。           |
| `src/views/app/group/_components/GroupModals/CreateGroupModal/index.tsx`    | 创建小组，信息填写、封面上传、默认权限。     |
| `src/views/app/group/_components/GroupModals/EditGroupInfoModal/index.tsx`  | 编辑小组信息，表单、封面、默认权限。         |
| `src/views/app/group/_components/MemberList/Modals/EditPermissionModal.tsx` | 修改成员权限，成员列表和角色选择。           |
| `src/views/app/group/_components/MemberList/Modals/AssignQuotaModal.tsx`    | 分配成员配额，成员列表和额度输入。           |
| `src/components/ChatPanel/ChatInput/DocumentPickerModal/index.tsx`          | 从云盘选择引用文档，树选择、多选、延迟加载。 |
| `src/components/ChatPanel/ChatInput/OtherSkillModal/index.tsx`              | 选择其他 Skill，树结构选择和确认。           |
| `src/components/Drive/Modals/UploadDocumentModal/index.tsx`                 | 上传文档，上传队列和挂载信息。               |
| `src/components/Drive/Modals/TagPermissionModal/index.tsx`                  | 标签权限管理，标签树、权限模式、用户权限。   |
| `src/components/Drive/Modals/MoveNodeModal/index.tsx`                       | 移动文件/文件夹，目标目录选择。              |
| `src/components/Drive/Modals/UploadFileToGroupModal/index.tsx`              | 上传个人文件到小组，选择文件和目标小组目录。 |

## 底层 Modal 例外

| 文件                                                                                    | 业务                       | 原因                                                                                   |
| --------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------- |
| `src/layouts/_common/Sidebar/AppSidebar/_components/GlobalSearch/SearchModal/index.tsx` | 全局搜索 command palette。 | 搜索浮层结构和交互更接近 Spotlight，需要完全自定义容器、body、异步结果区域和键盘体验。 |

## 新增 Overlay 的判断顺序

1. 危险、不可逆、需要明确确认的操作，使用 `AppAlertDialog`。
2. 轻量表单提交，使用 `AppFormDialog`。
3. 只读或展示型内容，只需要关闭、复制、打开等轻动作，使用 `AppDisplayDialog`。
4. 复杂业务流程、树选择、上传队列、多步骤配置，使用 `AppModal`，并显式提供 `actions` 或 `footer`。
5. 完全特殊的容器结构或 command palette 体验，才直接使用底层 `Modal`。
