# Layout 规范

Layout 只负责页面骨架与空间关系。判断一个实现是否属于 Layout，应看它是否只回答“内容放在哪里、何时显示、占多大、如何滚动以及焦点如何恢复”；业务对象、领域流程和页面意图都不属于 Layout。

## 一、允许维护

- 主内容与一个或多个命名槽位的结构、顺序和尺寸约束。
- 折叠、展开、互斥激活、断点、滚动和拖拽状态。
- 面板宽度、尺寸持久化和窗口尺寸变化后的布局恢复。
- 打开、关闭、切换和尺寸变更等只描述空间意图的语义化回调。
- 槽位标签、无障碍属性和焦点恢复所需的最小 UI 状态。

## 二、禁止维护

- 资源、聊天、评论、收藏、权限、编辑器运行时等领域对象或业务规则。
- service 调用、API 请求、加载/错误处理、业务乐观更新和草稿。
- 资源 id、路由参数、权限判断和业务文案拼装。
- 具体业务面板组件、菜单内容和业务图标选择。
- 为兼容旧布局保留第二套 store、alias、wrapper 或双路径。

## 三、依赖边界

`src/layouts/**` 中的纯布局目录不得 import：

- `src/components/business/**`
- `src/components/editors/**`
- `src/domains/**`
- `src/views/**`

业务内容由 view 组装后通过 `ReactNode` 槽位传入。需要跨子树向同一槽位渲染时，可以使用 Layout 提供的通用 portal 槽位；portal 只传递 React 子树，不传递领域对象。

当前 `src/layouts/WorkspaceRightPanelLayout` 已通过 ESLint 强制上述边界。历史 Layout 中已有的业务耦合按任务分批收敛，修改相关区域时应优先把业务内容移回 view。

## 四、状态归属

- Layout 状态放在对应 Layout 的 `_store` 或实例 Controller 中。
- 模块级持久化只保存尺寸、折叠等纯布局偏好，不持久化业务草稿。
- 同一空间内互斥的面板使用单一 `activePanelId`，不要分别维护多个布尔值后再做冲突修复。
- 面板内容需要跨切换保持时，应保持组件实例挂载，用 `hidden` / `inert` 隐藏非激活视图，而不是把业务状态复制到 Layout store。

## 五、命名槽位

- Panel 与 Slot 是两个概念：Panel 是可复用 UI 组件，负责标题栏、关闭动作和业务内容；Layout 只管理 `panelSlots` 等空间槽位。
- `WorkspacePanel` 属于工作区语义的跨页面业务组件，放在 `src/components/business/WorkspacePanel`；业务 Panel 通过它组合内容，不重复实现标题栏和关闭动作。不得仅因标题栏和关闭布局相似，就把工作区面板下沉到 `src/components/base`。
- 槽位 id 表达稳定位置或产品级面板身份，例如 `chat`、`inlineComment`、`interact`。
- 槽位 id 不得用于分支业务请求或权限判断。
- 面板显示名、可用性、业务内容与关闭后的业务清理均由 view 提供。
- 同一时刻只允许一个槽位处于激活状态；切换采用“新槽位顶替旧槽位”，关闭直接回到无激活槽位，不维护隐式历史栈。

## 六、验收检查

- [ ] Layout 文件没有业务、editor、domain 或 view import。
- [ ] Layout Props 只包含 ReactNode、尺寸、标识和布局意图回调。
- [ ] 同一物理区域不存在多个各自维护开关的竞争布局。
- [ ] 非激活槽位不可访问，但需要保留的实例未卸载。
- [ ] 删除旧布局后没有旧 store、导出或样式残留。
