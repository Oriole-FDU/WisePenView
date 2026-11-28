# 跨模块写法收束清单

本文盘点值得按照前端 error 重构模式继续治理的工程关注面：同一种责任有明确契约、有限入口、完整存量范例和自动约束，未来开发可以沿着同一套方式扩展。

这里的单位是**一类写法**。一个业务逻辑复杂、某个组件不好读、一个接口尚未完善，都不足以单独成为一项。代码示例用于证明跨模块的范式分歧，不是逐个业务的缺陷清单。

本文是候选项与实施顺序建议，不会自动替代现有规范。每项真正落地时，应更新其唯一规范文档；不把本清单复制成第二套规范。

## 一、收束什么，怎样算完成

值得独立推进的项应同时满足：

1. 同一种工程责任出现在多个模块中，存在相互竞争的实现方式或持续绕过公共入口的写法。
2. 能说清楚统一后的职责、数据流、调用入口和允许的差异，不只要求“写得更规范”。
3. 至少部分边界可以通过类型、导入限制、AST lint 或现有契约检查阻止回退。
4. 可以迁移现有调用并删除旧路径，让代码库本身成为新开发的参考。

统一不等于所有业务使用同一个巨型 hook。查询替换与分页追加、单次提交与自动保存、普通表单与协同编辑存在真实差异；应统一责任和协议，并显式表达差异。

每项的完成定义：

- 一份说明职责和取舍的主要规范，业务特殊规则链接到所属 `BUSINESS.md`。
- 少量承担稳定责任的公开入口，以及覆盖主要场景的真实生产用例。
- 同一责任下的旧调用、转发层、迁移 alias 和无理由的旁路一起删除。
- 可机械判断的违规写法进入自动检查；迁移完成的规则接入默认 CI 并能阻塞回退。
- 难以机械判断的行为列出不变量与审查点，不承诺 lint 能证明全部正确。

成本影响拆批和依赖顺序，不作为拒绝治理的理由。一个批次可以只覆盖某类调用，但不能在该范围内长期留下两套同等合法的写法。

## 二、已有基础

仓库已经有 API Contract、服务装配、正式路由、状态生命周期、表单、浮层和 token 规范。下一轮工作的主要价值是补齐“文档、公共实现、存量代码、阻塞检查”之间的缺口，而不是从零再设计一套框架。

扫描参考版本：`4081c08e`。检查覆盖 `src` 的调用模式、相关工程规范、自定义 ESLint、检查脚本和 CI 入口；使用三个并行子 agent 分别核对状态、领域边界和平台／UI 能力，主线核对异步与表单。

一次无缓存的 `pnpm exec eslint src --format json --no-cache` 扫描了 1454 个文件，结果为 0 error、359 warning。其中 Promise 消费相关 85 条、`useEffect` 96 条、Domain 约定 85 条。这些只是定位样本的线索，不把 warning 数量直接等同于架构问题数量。

## 三、候选项

共整理 **14 个治理项，加 1 个 error 参照项**。C13 已形成目录标准、接入阻塞 lint 并完成首批机械迁移，复杂存量保留具名 TODO；其余项仍是候选收束工程。优先级表示依赖和扩散影响，不代表当前相关业务已有故障，也不按改造成本高低排列。

| 编号 | 关注面                   | 当前分歧                                               | 建议顺序                     |
| ---- | ------------------------ | ------------------------------------------------------ | ---------------------------- |
| C00  | 错误创建、传播与消费     | 已有规范、入口和迁移，默认 CI 门禁仍需补齐             | 参照与补强                   |
| C01  | Promise、事件与回调      | 等待责任、异步通知和消费入口不稳定                     | 第一批基础                   |
| C02  | 任务作用域、失效与释放   | 请求序号、销毁标记、缓存代次等机制各自决定             | 第一批基础                   |
| C03  | 查询、分页与结果状态     | 公共查询入口与底层 hook、自管分页并存                  | 第一批                       |
| C04  | 写操作完成与变更传播     | 局部刷新、父回调、模块信号多链路并存                   | 第二批，依赖 C01–C03         |
| C05  | 表单校验、提交与草稿退出 | 已有规范和基础能力，存量仍重建生命周期                 | 第一批，接续 C01             |
| C06  | 跨所有者状态通信         | 共同 owner 协议与穿透私有 store 并存                   | 第一批，可独立推进           |
| C07  | 持久化声明与清理         | 按 scope 清理、自管连接、启动层枚举并存                | 第二批，接续 C02             |
| C08  | 领域公共数据边界         | 展示数据、完整实体与传输类型边界不齐                   | 第一批，可独立推进           |
| C09  | 角色到操作能力           | 能力表、展示配置和页面角色判断并存                     | 第二批，可独立推进           |
| C10  | 时间表示与展示           | 毫秒、ISO、数字字符串、展示文本混用                    | 第二批，可独立推进           |
| C11  | 剪贴板动作与反馈         | 纯文本已有入口，格式回退与反馈仍各自实现               | 第三批，边界较窄             |
| C12  | 历史导航命令             | 平台适配入口与页面直接操作历史并存                     | 第三批，先明确 Provider 范围 |
| C13  | 组件目录与私有边界       | 目录契约与阻塞 lint 已接入；复杂存量保留精确 TODO      | 前置批次                     |
| C14  | 组件、hook 与副作用职责  | 组件内 effect、领域 hook、生命周期替换缺少统一选择协议 | 接续 C13，与异步基础协同     |

### C00｜错误创建、传播与消费：已落地的参照项

**统一的责任**：错误是什么、在哪里创建、在哪里结束传播、谁负责提示与上报。

以下参照来自尚未合入主干的 [错误契约 PR #644](https://github.com/Oriole-FDU/WisePenView/pull/644)，链接固定在该分支的 `d0fa9879`；组件目录规范独立基于 `main`。

该 PR 中的规范与实现：[`error.md`](https://github.com/Oriole-FDU/WisePenView/blob/d0fa9879/agent/docs/error.md)、[`createError`](https://github.com/Oriole-FDU/WisePenView/blob/d0fa9879/src/utils/error/createError.ts)、[`reportError`](https://github.com/Oriole-FDU/WisePenView/blob/d0fa9879/src/utils/error/reportError.ts) 和 [`lint/error.js`](../../lint/error.js)。底层创建并抛出，消费边界上报和提示，根 Boundary 兜底。

后续项目应复用这种收束方式：先明确责任，再提供入口、迁移调用和删除旧入口，最后阻止旧写法返回。

**仍需补上的门禁**：扫描快照中的错误自定义规则配置为 warning，独立 `lint:error` 会因命中而失败，但默认 CI 没有调用该命令。后续在 `d0fa9879` 复核：规则已通过 [`lint/contracts.js`](../../lint/contracts.js) 统一登记，`lint:error` 已复用公共专项入口，默认严重级别仍为 warning；[`package.json`](../../package.json) 的 `verify:ci`／`check:ci` 仍未调用专项检查。因此“有 lint”与“默认 CI 能阻止回退”还不完全等价。落地其它项时应一并确认实际检查链路。

同对象遥测去重也不能直接推出 toast 去重：该 PR 的 [`reportError.ts`](https://github.com/Oriole-FDU/WisePenView/blob/d0fa9879/src/utils/error/reportError.ts) 在 `captureException` 后直接展示提示。是否重复消费、是否需要重复提示，仍要由契约及消费边界保证。

### C01｜Promise、事件与回调的消费协议

**统一的责任**：一个异步操作由谁等待、谁接住拒绝、回调完成是否属于外层操作完成。

**跨模块写法分歧**：

- [`DriveCreateModal`](../../src/components/business/Drive/Modals/DriveCreateModal/index.tsx) 第 94 行在请求函数中 `await onSuccess(...)`，将外部回调纳入任务完成条件。
- [`SessionMenuItem`](../../src/components/business/Sidebar/_common/tab/_parts/SessionTab/_parts/SessionMenuItem/index.tsx) 第 32、47 行和 [`OwnerGroupTokenTransfer`](../../src/views/app/group/_components/OwnerGroupTokenTransfer/index.tsx) 第 65、82 行向 `useApi` 的 `onSuccess` 传入异步函数，承担刷新任务。
- [`AccountForm`](../../src/views/app/profile/_components/Account/AccountForm/index.tsx) 第 116、150 行分别使用任务内等待外部刷新、事件中 `void runSave()`；其它交互又直接传异步 handler。项目已有 `no-floating-promises`／`no-misused-promises`，但仍只作为 warning。

这些写法共同说明：业务开发仍需自行判断“事件入口”“可等待任务”“通知回调”之间的 Promise 责任。即使都使用 `useApi`，外部表现也未形成稳定协议。

**目标契约与入口**：

- 事件入口返回 `void`，内部明确启动并终结异步任务；需要编排的任务返回 `Promise<T>`，由调用者等待或消费。
- 区分仅通知的同步回调与必须等待的异步回调；类型、实现和文档对等待语义保持一致。
- 明确 `run`／`runAsync` 的异常所有权，沿用 error 的消费边界，不重复 report 后继续向另一消费入口传播。
- 不能用批量添加 `void` 代替拒绝处理；`void` 本身不捕获异常。

优先完善现有 `useApi` 和公共组件回调类型，不额外叠加一个通用异步框架。

**自动约束**：按已明确的回调契约启用 Promise 类型检查；迁移后提升相关规则等级。对已有统一消费能力的入口约束调用方式，不凭方法名猜测所有业务异步函数。

**迁移删除**：语义不明的 `() => void | Promise<void>`、未被等待的异步通知、只为避开告警存在的 wrapper。确需两种返回方式的公开协议须明确由谁等待，不能仅因联合类型存在就删除。

**优先级：第一批。** 这是跨页面、弹窗、列表、编辑器共同使用的基础调用协议。

### C02｜异步任务的作用域、失效与释放

**统一的责任**：任务属于哪个账号、资源、会话或查询；作用域切换后，旧结果是否还允许提交状态；资源由谁释放。

**跨模块写法分歧**：

- [`useChatHistory`](../../src/domains/ChatSession/session/useChatHistory.ts) 第 41、60、72 行通过请求版本和会话 ID 判定旧结果失效。
- [`drawioSaveSession`](../../src/components/editors/drawio/_common/drawioSaveSession.ts) 第 22、69 行使用实例销毁标记与任务身份；[`editorRuntime`](../../src/components/editors/_runtime/editorRuntime.ts) 第 67、96 行使用 session 身份和 `AbortSignal` 协商退出。
- [`useSkillWorkspaceCacheController`](../../src/components/editors/skill/_hooks/useSkillWorkspaceCacheController.ts) 的异步读取使用局部 `disposed`；课程封面预览在 [`useCourseEditorFormController`](../../src/views/app/course/CourseEditorPage/_hooks/useCourseEditorFormController.ts) 中另用请求序号。
- [`useDrivePagedTreeChildren`](../../src/components/business/Drive/_common/useDrivePagedTreeChildren.ts) 第 90、158 行自行维护请求后的缓存写入和 reset，与上层 `useApi` 并存。上层 hook 管理自身结果，并不等于下层异步函数内部的所有写入都归其管理。
- Service 缓存也存在同一分歧：[`UserServices.impl.ts`](../../src/domains/User/service/UserServices.impl.ts) 第 77、93–98 行、[`TagServices.impl.ts`](../../src/domains/Tag/service/TagServices.impl.ts) 第 83、112–114、134–141 行清空缓存与异步回填分别实现；[`sessionCache.ts`](../../src/domains/ChatSession/session/sessionCache.ts) 第 20–40 行使用 snapshot 和 generation 保护提交；[`ossStsClient.ts`](../../src/domains/_shared/ossStsClient.ts) 第 58–61、83–105 行则同时检查代次和 pending Promise 身份。

这些机制各有用途；待统一的是开发者选择机制的依据，以及“何时还能写回”的共同规则。

**目标契约与入口**：

- 每个有状态任务具有明确 owner 和 scope key；同 scope 的并发策略显式选择替换、互斥、追加或排队。
- 切换 scope、reset、卸载时，旧任务同时失去写成功、写失败和清理新任务状态的资格。
- 取消导航意图、停止客户端连接、取消后端任务分别表达，不能因都叫 `cancel` 就混用。
- hook／runtime 拥有它启动的订阅、定时器和连接；纯函数不偷偷启动后台生命周期。
- 内存缓存失效不只是删除 Map 条目，还应使相关在途任务失去回填资格；全 scope 失效与按 key 失效显式表达。列表的领域合并策略仍留在领域，不能用一个全能缓存框架替代。

以现有会话 runtime 为范例，先形成统一生命周期协议，再决定哪些机制确实值得抽成共享能力。不要把所有任务强制改成同一种取消实现。

**自动约束**：限制底层订阅和连接的创建位置，检查已批准基础入口的导入边界；类型表达 scope 和释放能力。AST 无法普遍证明所有 `await` 后写入安全，任务失效不变量仍需审查及针对性验证。

**迁移删除**：重复的任务身份判断、无归属后台调用、仅把 effect 换个 hook 名称的转发层。有效的领域状态机继续保留。

**优先级：第一批。** 它决定后续列表、表单、缓存收束能否建立在同一套异步责任上，实施成本较高也应推进。

### C03｜服务端查询、分页与结果状态

**统一的责任**：如何发起服务端读取、如何表示首次加载／刷新／追加／失败／空结果，以及 query key 变化后如何处理旧数据。

**跨模块写法分歧**：

- [`useApi.ts`](../../src/hooks/useApi.ts) 已提供普通查询、分页和无限列表三个入口，同时维护 `empty`、`loaded`、`hasError`。
- [`useFavoriteResources`](../../src/views/app/drive/_components/FavoritesTab/_hooks/useFavoriteResources.ts) 第 18、41 行直连 `useInfiniteScroll`，自行计算页码并在 effect 中清空旧列表。
- [`ResourceInteractionPanel`](../../src/components/business/Resource/ResourceInteractionPanel/index.tsx) 第 119、146 行和 [`ResourceCommentThread`](../../src/components/business/Resource/ResourceInteractionPanel/_parts/ResourceCommentThread/index.tsx) 第 74、99 行重复维护分页、重载、清空与局部错误。
- [`ChatSessionBar`](../../src/components/business/Chat/_parts/ChatConversation/_parts/ChatSessionBar/index.tsx) 第 35 行、[`AgentPicker`](../../src/components/business/Chat/_parts/ChatConversation/_parts/ChatInput/_parts/AgentPicker/index.tsx) 第 80 行直连无限列表；[`ComputeWallet`](../../src/components/business/Wallet/ComputeWallet/index.tsx) 第 120 行直连 `usePagination`。这些都读取领域 service，与普通查询 wrapper 并存。
- 结果消费也不一致：[`notifications`](../../src/views/app/notifications/index.tsx) 第 196–220 行显式区分失败、加载和空结果；[`useFavoriteCollections`](../../src/views/app/drive/_components/FavoritesTab/_hooks/useFavoriteCollections.ts) 只返回 `data ?? []`、加载状态和刷新，消费页 [`FavoritesTab`](../../src/views/app/drive/_components/FavoritesTab/index.tsx) 第 34–48 行没有读取错误状态；[`ResourceSearchResults`](../../src/components/business/CommandPalette/ResourceSearchResults.tsx) 第 117、211 行也自行选择部分状态用于展示。问题是状态协议在封装和消费途中丢失，不能只靠补一个通用空状态组件解决。

**目标契约与入口**：

- 服务端读取统一经过现有项目查询入口；保留普通读取、页码分页和游标追加三种明确能力。
- query key、重置、追加、去重、末页、保留旧数据和错误消费有稳定约定，页面只提供查询与条目标识。
- 结果状态区分未开始、首次加载、刷新中、追加中、成功为空、成功有数据和失败；错误不能仅靠 `data ?? []` 被显示成空结果。
- 通用入口不能推断所有业务的空值语义；对象型 payload 的空状态由明确 selector 提供。
- 本地代码高亮、Mermaid 渲染等非接口异步任务继续使用适合其职责的工具，不因同样使用 ahooks 就纳入服务端查询约束。

**自动约束**：在项目查询实现外限制直接使用服务端请求 hook；规则按用途与允许目录限定，不能全仓禁止 ahooks。状态类型约束结果消费；lint 不负责推断业务“空”的意义。

**迁移删除**：分页调用旁重复的页码计算、清空 effect、末页计算与同义状态；保留领域特有的消息合并和树结构语义。

**优先级：第一批。** 跨收藏、评论、聊天、钱包已具备同类证据，现有入口也能承接迁移。

### C04｜写操作完成与变更传播

**统一的责任**：写入何时算成功、读模型如何更新、谁负责通知相关视图，刷新失败是否改变已提交结果。

**跨模块写法分歧**：

- [`driveRefresh`](../../src/components/business/Drive/driveRefresh.ts) 提供模块级刷新版本；[`useTableDriveActionsController`](../../src/components/business/Drive/TableDrive/_hooks/useTableDriveActionsController.tsx) 同时使用 `requestDriveRefresh()`、局部 `refresh()` 和 `onNodeActionSuccess()`。
- [`useFavoriteResourceTableController`](../../src/views/app/drive/_components/FavoritesTab/_hooks/useFavoriteResourceTableController.ts) 第 45 行组合局部刷新和父级 `onCollectionChanged()`。
- [`ResourceCommentThread`](../../src/components/business/Resource/ResourceInteractionPanel/_parts/ResourceCommentThread/index.tsx) 第 146–156 行将创建回复、刷新回复、通知上级串在一个任务中。
- [`AccountHeader`](../../src/views/app/profile/_components/Account/AccountHeader/index.tsx) 第 36–41 行、[`AccountForm`](../../src/views/app/profile/_components/Account/AccountForm/index.tsx) 第 115–116 行在更新后等待外部 reload；课程编辑又在 `onSuccess` 中触发刷新。

关注点是这些调用共同承担的“写后同步”责任，而不是决定某次写操作应该刷新哪个业务列表。

**目标契约与入口**：

- 区分命令提交结果、缓存／读模型失效、展示完成三种责任；业务事务必须等待的步骤仍归领域命令。
- 已提交的命令不会仅因展示刷新失败就被重新解释成尚未提交；重试刷新与重试写入分别表达。
- 同一数据集合由明确 owner 定义变更信号和刷新范围，写操作只发布一次必要的变化，不同时维护数条意义相同的通知链。
- 事件携带稳定业务标识或范围；优先在共同 owner 下编排，避免建立任意字符串广播的全局 event bus。

从现有 Drive、会话历史等具名变更协议中收敛共同约定，具体领域的刷新依赖留在领域或共同 owner。

**自动约束**：约束旧刷新协议和跨模块私有 store 导入；类型区分命令结果与同步结果。哪些查询受某条命令影响属于业务知识，不能用 lint 自动猜。

**迁移删除**：相同语义的刷新版本、回调、imperative `ref.refresh()` 多路径，以及混淆提交结果的通知 wrapper。

**优先级：第二批，紧随 C01–C03。** 先冻结等待与查询语义，再统一写后传播。

### C05｜表单校验、提交与草稿退出

**统一的责任**：字段何时校验、提交如何开始与结束、失败保留什么、关闭或离开如何处置未保存工作。

**跨模块写法分歧**：

- [`forms.md`](forms.md) 已规定字段结构、统一校验时机和离开保护；[`useFormValidation`](../../src/hooks/useFormValidation.ts)、[`useUnsavedChangesGuard`](../../src/hooks/useUnsavedChangesGuard.ts) 已有实现，注册、改密和课程编辑已有调用。
- [`CreateGroupModal`](../../src/views/app/group/_components/GroupModals/CreateGroupModal/index.tsx) 第 97–116 行与 [`UserFeedbackModal`](../../src/components/business/Sidebar/_common/footer/UserFeedbackModal/index.tsx) 第 117–146 行仍各自维护 `validateForm`、toast 校验、提交与 reset。
- [`SessionMenuItem`](../../src/components/business/Sidebar/_common/tab/_parts/SessionTab/_parts/SessionMenuItem/index.tsx) 第 20、55 行另管字段错误；[`MemberList`](../../src/components/business/Group/MemberList/index.tsx) 同时维护 inline draft、错误行、保存行和 toast 校验。
- [`useFormSubmit`](../../src/hooks/useFormSubmit.ts) 已提供提交入口，但全仓符号搜索未发现消费方。说明存在公共入口尚未成为存量范式的情况；不能因为它存在就宣布已经统一。

**目标契约与入口**：

- 继续复用 `FormField` 和 `useFormValidation`；字段规则由业务提供，触碰、提交后持续校验和错误清除由公共机制拥有。
- 提交采用 C01 的事件／Promise 契约，明确 pending 互斥、成功 reset、失败保留草稿和服务端字段错误。
- 普通表单的取消、关闭、路由离开、浏览器离开共享草稿决策；资源编辑器继续使用已有 Editor Runtime，不强塞进普通表单。
- 行内编辑是明确的表单变体，拥有行级 key 和 pending 策略，不再由每张表自行拼装整套生命周期。

实现上应先判断 `useFormSubmit` 能否承接目标契约；能则迁移，不能则替换并删除，不能再新增第三个同义入口。版式组件仍不接管所有表单业务。

**自动约束**：在表单规范范围内约束旧表单入口、直接使用底层字段原语、绕过离开保护原语等明确模式。是否存在有效草稿、字段规则是否正确、关闭是否应丢弃，需要业务契约；不能通过扫描 `validateForm` 名字就认定违规。

**迁移删除**：公共校验能力已经覆盖的 `touched`／`submitted`／错误状态、只弹 toast 的字段校验、重复提交与关闭控制，以及最终不采用的无调用公共 hook。

**优先级：第一批。** 现有文档和实现已经具备，但多个模块仍在重新决定相同的交互机制。

### C06｜跨所有者的状态通信

**统一的责任**：模块如何请求另一个模块执行动作，谁拥有跨挂载消息，调用者能依赖哪些公开协议。

**跨模块写法分歧**：

- [`store.md`](store.md) 已规定共同 owner 与私有状态边界；[`useChatSessionHistoryRefreshStore`](../../src/layouts/AppLayout/_common/store/useChatSessionHistoryRefreshStore.ts) 是明确归属 AppLayout 的协议，Chat 和 Sidebar 不依赖彼此实现。
- [`useNoteLinkResolver`](../../src/components/business/Chat/_hooks/useNoteLinkResolver.ts) 第 6、32 行直接依赖 Note 的私有 `_store` 派发定位动作。
- [`useTableDriveActionsController`](../../src/components/business/Drive/TableDrive/_hooks/useTableDriveActionsController.tsx) 第 196 行通过 `useNewNoteStore.getState()` 写入编辑器状态；[`TrashDeleteModal`](../../src/components/business/Drive/Modals/TrashDeleteModal/index.tsx) 第 6–7、19–25 行直接协调 Note 和 PDF 私有状态清理。

不是所有跨目录 store 都应删除：共同 Layout 的公开协议本来就需要被下层模块共同消费。要消除的是“业务动作依赖对方私有存储结构”的默认写法。

**目标契约与入口**：

- 同步交互通过公开 port 或 callback；需要跨挂载投递的消息由共同 View／Layout 的协议 store 承担。
- 协议只表达稳定动作与参数，不暴露 Zustand 存储形状、组件 ref 或对方内部步骤。
- 协议 owner 决定消息的消费次数、有效期和重置时机，接续 C02；状态实现放在实际 owner，不能把私有 store 搬到全局目录就算完成。
- 领域删除等动作触发编辑器清理时，依赖公开生命周期能力，而不是由弹窗枚举每种编辑器的内部状态。

**自动约束**：解析路径别名、相对路径和再导出，禁止同级模块引用彼此 `_store`；允许共同 owner 的协议导入。仅检查路径中是否出现 `_store` 会误伤合法依赖，也拦不住 barrel 绕过。

**迁移删除**：跨 owner 的私有状态读写、只把私有 store 原样转发的公开 barrel，以及同一动作的旁路投递。继续复用现有 Context 和 Provider 作用域规范。

**优先级：第一批。** 已有清楚的规范与正例，可以先迁移并封住依赖方向；其业务消息语义不要求一次全部统一。

### C07｜持久化资源的声明、释放与清理

**统一的责任**：本地数据属于谁、保留多久、账号切换或登出如何清理，清理时如何发现数据并释放连接。

**跨模块写法分歧**：

- [`persistence.ts`](../../src/store/persistence.ts) 第 7–33 行用 scope 命名空间统一处理 Zustand sessionStorage，清理不依赖某个懒加载模块是否已经注册。
- [`App.tsx`](../../src/bootstrap/App.tsx) 第 28–35 行仍手工枚举 Skill 数据库和 Note room 前缀，使启动层掌握具体业务存储清单。
- [`skillDraftCache.ts`](../../src/components/editors/skill/_common/skillDraftCache.ts) 第 25–31、55 行采用账号／资源 key，自管数据库与事务；[`useNoteSession`](../../src/domains/Note/session/useNoteSession.ts) 第 73–98、131 行自行创建与销毁 Yjs IndexedDB persistence。

这些实现已经包含账号隔离，不能写成“项目没有隔离”。竞争范式在于如何接入项目生命周期，以及新增一种存储时，开发者需要记住到哪里补清理。

**目标契约与入口**：

- 用轻量 descriptor 声明 owner、scope、namespace 和清理适配器；descriptor 在业务模块尚未加载时也可发现，活动连接在运行时注册释放。
- 认证层只调用生命周期协调器；领域拥有数据格式、升级和具体清理实现。
- 清理协议明确先使旧任务失效、再释放连接和清理数据的顺序，衔接 C02，不能让旧任务在清理后重新写回。
- 同账号重新进入是否保留草稿、删除整个库还是指定范围、blocked 如何处理，必须成为显式策略；不把所有数据一律按同一时机删除。

不统一 IndexedDB、Yjs 与 Zustand 的数据实现。公共入口统一的是生命周期接入责任。

**自动约束**：限制原始存储 API 的使用位置、校验 descriptor 必需字段，约束启动层新增业务清理清单。不能简单禁止所有 `sessionStorage`／IndexedDB 调用，也不能只靠运行时注册表发现未加载模块的数据。

**迁移删除**：启动层中的逐业务清理枚举、重复的 namespace 拼接与生命周期接线；有领域语义的数据库升级、事务与草稿合并继续保留。

**优先级：第二批，接续 C02。** 这是跨存储后端的工程接入统一，不是修一个缓存业务。

### C08｜领域公共输出、传输类型与完整实体的边界

**统一的责任**：跨领域调用可以拿到什么数据，展示摘要、完整聚合和 API 传输类型各自归谁。

**跨模块写法分歧**：

- [`Document/service/index.type.ts`](../../src/domains/Document/service/index.type.ts) 第 45–47 行的展示响应携带完整 `ResourceItem`，第 75 行的公共 service 又直接返回 `ResourceItemApi`。
- [`FavoriteItem`](../../src/domains/ResourceFavorite/entity/favorite.ts) 第 14–18 行嵌入完整资源实体；[`AgentServices.impl.ts`](../../src/domains/Agent/service/AgentServices.impl.ts) 第 33–35 行的权限聚合入口直接返回 API 的 `resourceInfo`。
- [`SkillServices.map.ts`](../../src/domains/Skill/mapper/SkillServices.map.ts) 第 132–146 行与 [`AgentServices.map.ts`](../../src/domains/Agent/mapper/AgentServices.map.ts) 第 149–170 行同时输出嵌套资源实体及顶层标题、owner、动作等字段；两种取值路径都可能成为消费方的依赖。
- Domain 规范已经要求公开出口，扫描仍发现跨域深导入告警。导出位置一致只是第一步，还应明确公共类型为何需要这些字段。

这是跨领域数据输出的范式问题。`ResourceSummary` 已列入 [`schema-contract-roadmap.md`](schema-contract-roadmap.md) 的 F1，属于已知债务的具体推进，不应包装成新发现。

**目标契约与入口**：

- 展示调用消费稳定摘要，完整资源聚合留给真正需要完整数据的上层；权限聚合使用内部的明确输入契约，不因当前后端返回完整 DTO 就向所有消费方暴露。
- API DTO 留在 API／mapper 边界；公共 service 输出由领域定义，确需跨域传输的内部桥接也应有明确归属和导入范围。
- 同一事实有一个权威字段；确需派生的展示字段标注语义，不能让调用者自行选择顶层或嵌套副本。
- 先稳定摘要契约，再按相同责任迁移叶域，删除完整实体穿透和旧别名，避免各域各造一份临时摘要。

F1 可以由前端推进。后端 B3 权限聚合接口解决的是请求和聚合责任，不能作为等待前端公共输出边界收束的理由。

**自动约束**：约束跨域深导入、叶域公共输出中的完整资源类型和 raw DTO 暴露；类型可达性检查应覆盖 alias 和再导出。不能禁止所有领域聚合使用完整实体，也不能只把类型搬到 `index.ts` 就宣告边界完成。

**迁移删除**：仅为绕过边界存在的再导出、重复表达资源事实的字段和宽于用途的公共依赖。

**优先级：第一批，可独立推进。** 数据边界决定后续业务自然会写出怎样的依赖，迁移涉及多个领域也值得做。

### C09｜角色到操作能力的转换

**统一的责任**：授权事实在哪里转成具名能力，路由、按钮和操作如何共同消费。

**跨模块写法分歧**：

- [`GroupDisplayConfig.ts`](../../src/components/business/Group/GroupDisplayConfig.ts) 第 16–49 行把展示偏好和操作能力放在同一个矩阵；[`GroupWalletRouteGuard`](../../src/views/app/group/GroupDetail/_guards/GroupWalletRouteGuard/index.tsx) 第 9–13 行使用 `showWalletTabs` 判断路由准入。
- [`GroupDescriptionSettings`](../../src/views/app/group/GroupDetail/_parts/GroupDescriptionSettings/index.tsx) 第 33–34 行又在页面里调用 `isOwner`／`isAdmin` 派生能力。
- [`CourseMaterialsPage`](../../src/views/app/course/CourseMaterialsPage/index.tsx) 第 13–14 行直接比较角色以生成 Drive 操作能力；[`CourseSettingsRouteGuard`](../../src/views/app/course/_guards/CourseSettingsRouteGuard/index.tsx) 第 7–9 行又自行比较角色控制路由。

课程资料管理和课程设置本来可以有不同授权规则，不应把条件不同当 Bug。需要统一的是规则的归属与调用方式。

**目标契约与入口**：

- 每个授权领域提供纯能力推导入口，例如 `getGroupCapabilities`／`getCourseCapabilities`；名称是建议，不能与现有资源动作基础设施另建重复体系。
- 路由、按钮、菜单和操作入口消费具名能力；展示配置消费能力，不反过来用“是否显示某个 Tab”代替准入能力。
- 涉及目标成员、资源关系和作用域的能力明确接收必要上下文，不退化成所有业务通用的一张角色等级表。
- 集中迁移当前行为，再讨论业务策略调整；前端能力用于交互约束，后端授权契约仍是独立责任。

现有资源动作 `_shared/access` 已有公共基础，不需要整体推倒重建，也不引入通用权限规则引擎。

**自动约束**：限定策略 owner，禁止已迁移消费层继续导入旧策略入口；对明确的角色到能力分支建立检查。角色标签、角色编辑、跨域角色映射仍可合法使用角色，AST 不能普遍判定所有角色比较都在授权。

**迁移删除**：页面中的授权公式、以展示布尔值代替能力的调用、同一能力的多份定义。不同业务能力保留不同策略。

**优先级：第二批，可独立推进。** 集中的是工程表达，真实权限规则仍需要业务描述验证。

### C10｜时间的领域表示与展示转换

**统一的责任**：一个时间字段表示时间点、日期、钟点还是展示文本；单位和时区在哪一层确定。

**跨模块写法分歧**：

- [`GroupServices.map.ts`](../../src/domains/Group/mapper/GroupServices.map.ts) 第 71 行把 `createTime` 格式化成日期展示文本；[`groupMember.mapper.ts`](../../src/domains/Group/mapper/groupMember.mapper.ts) 第 22 行把 `joinTime` 转成 ISO 字符串。
- [`WalletServices.map.ts`](../../src/domains/Wallet/mapper/WalletServices.map.ts) 第 81 行将 `createTime` 变为字符串；[`HtmlPageServices.map.ts`](../../src/domains/HtmlPage/mapper/HtmlPageServices.map.ts) 第 18–19 行保留数值 `updateTime`，另提供 `lastEditedAtText`。
- [`formatTime.ts`](../../src/utils/format/formatTime.ts) 第 3–27 行接受数字、字符串和 Date，再按数值大小猜秒或毫秒；而 [`apis/schema/time.ts`](../../src/apis/schema/time.ts) 已区分毫秒与 ISO wire schema。

结果是消费方无法仅凭字段类型确定是否还能排序、计算、重新格式化，公共 formatter 又承担猜测上游表示的责任。

**目标契约与入口**：

- 明确时间点、日历日期、钟点和展示文本，选择稳定的领域表示与公共类型；展示文本以明确的 `*Text` 命名或在展示层生成。
- 已知是毫秒的字段直接走明确单位入口，不先转 String／ISO，再由通用函数猜单位。
- wire 解析留在契约和 mapper 边界；允许不同后端采用不同 wire 格式，但转成领域数据时明确单位与时区语义。
- 无时区 ISO 不能擅自补成本地或 UTC 时间点；无法确定语义的字段单独记录待决策，不用 fallback 掩盖。

[`schema-contract-roadmap.md`](schema-contract-roadmap.md) 的 D5 是后端长期 wire 选择，与前端先消除表示混乱可以分别推进。不需要等待后端把所有时间改成同一种 JSON 类型。

**自动约束**：复用既有时间 schema，限制已迁移路径继续调用猜单位入口，利用类型区分领域时间与展示文本；不全仓禁止 `Date.now()`、`toISOString()` 或 `String()`。

**迁移删除**：已知格式的反复编码／解析、名称像原始时间实际却是展示文本的字段、确认无调用后删除的猜测兼容分支。

**优先级：第二批，可独立推进。** 覆盖多个领域，收束后能直接减少未来消费方猜字段语义的需要。

### C11｜剪贴板动作、格式回退与反馈

**统一的责任**：什么算复制成功，实际写入什么格式，谁决定成功／失败反馈及复制状态。

**跨模块写法分歧**：

- [`copyText.ts`](../../src/utils/browser/copyText.ts) 已有纯文本入口，返回 boolean，内部实现 Clipboard API 与 `execCommand` 回退。
- [`CopyButton`](../../src/components/base/Button/CopyButton/index.tsx) 第 24–41 行负责结果转错误、toast 和计时状态；[`InviteUserModal`](../../src/components/business/Group/MemberList/Modals/InviteUserModal/index.tsx) 第 36–65 行与 [`ErrorPage`](../../src/components/business/ErrorPage/ErrorPage.tsx) 第 40–52 行又各自编排复制结果与反馈。
- [`Note sideMenu`](../../src/components/editors/note/CustomBlockNote/ui/sideMenu/index.tsx) 第 140–155 行自行增加 HTML 写入与纯文本回退，第 447–460 行再将 boolean 与剪切删除结合，失败时没有显式反馈。

复制按钮和剪切菜单可以有不同交互，值得统一的是平台能力、结果语义和反馈的明确选择，不能把所有差异都视作重复代码。

**目标契约与入口**：

- 扩展已有剪贴板适配层，支持 text／HTML；需要格式回退时，结果能表达实际格式和失败，避免仅靠 true 推断富文本已完整写入。
- UI 动作层统一结果到 error 的转换、复制状态与释放，调用方明确选择 toast、局部状态或静默策略；不在底层平台函数中强制 toast。
- 剪切成功后删除仍归编辑器动作，并明确允许什么格式的复制成功触发删除；公共复制能力不持有业务删除回调。

**自动约束**：适配层外限制直接调用 `navigator.clipboard`、`ClipboardItem` 和 `execCommand('copy')`，UI 层复用统一结果契约。不要新建另一个同义 `copyText`，也不借此扩展成全项目文件 I/O 框架。

**迁移删除**：分散的平台回退、重复的错误转换和计时释放逻辑；合法的不同文案、局部展示和编辑器动作继续保留。

**优先级：第三批。** 证据成立，范围较窄，可作为一次完整收束工程推进。

### C12｜历史导航命令与平台适配边界

**统一的责任**：前进／后退到底作用于哪种历史，谁适配 Web／桌面语义，公共内容组件如何获取动作。

**跨模块写法分歧**：

- [`routing.md`](routing.md) 已规定 Web 与桌面历史语义；[`AppNavigationLayout`](../../src/layouts/AppNavigation/AppNavigationLayout/index.tsx) 第 58–70 行适配 desktop bridge 与 React Router，AppLayout 使用该协议。
- [`ErrorPage`](../../src/components/business/ErrorPage/ErrorPage.tsx) 第 65 行、[`ForbiddenRoute`](../../src/views/app/error/ForbiddenRoute/index.tsx) 第 21 行和 [`ResourceNotFound`](../../src/views/app/error/ResourceNotFound/index.tsx) 第 24 行直接 `navigate(-1)`，没有使用上述平台动作。
- [`router.tsx`](../../src/bootstrap/router/router.tsx) 第 362–399 行的 admin 和全局兜底位于不同壳层；共享错误内容不能假定始终拥有 AppNavigation Provider。

**目标契约与入口**：

- 明确 app、admin、public 各自可用的历史动作及语义；复用平台适配，app 业务不自行选择原生历史还是 Router 历史。
- 公共错误内容消费注入的 `onBack` 等动作；由实际页面／壳层提供适合当前范围的导航能力，避免让无 Provider 的页面直接调用业务 hook。
- 无可后退记录时是否展示动作、是否进入固定路径，应按所属壳层明确决定，不能用一个通用 fallback 掩盖范围差异。
- 路径构造继续复用现有 route builder，不另建导航系统，也不把前进／后退与所有路由跳转强制塞入同一个入口。

**自动约束**：平台适配层外限制 `navigate(number)`、`window.history.back/forward/go` 等历史命令，明确允许位置。Provider 覆盖和错误边界层级仍需结构审查。

**迁移删除**：页面绕过平台语义的历史命令和重复平台判断；各壳层合法的不同返回策略保留。

**优先级：第三批。** 已有规范与入口，补齐作用域后迁移并加门禁即可。

### C13｜组件目录与私有实现边界

**统一的责任**：开发者进入任意组件后，能沿相同路径找到入口、类型、样式、UI 拆分、行为逻辑和内部共享能力。

**跨模块写法分歧**：

- 原 [`component-boundary.md`](component-boundary.md) 同时允许 `hooks`、`controllers`、`utils` 和根部 helper，页面模板又使用 `components`、`config`；同一工程责任有多个合法位置。
- [`TableDrive`](../../src/components/business/Drive/TableDrive/index.tsx) 的拆分包含 `parts`、`controllers` 和根部 config；[`CourseEditorPage`](../../src/views/app/course/CourseEditorPage/index.tsx) 包含 `_components`、`controllers` 和根部 model／mapper；[`Chat`](../../src/components/business/Chat/index.tsx) 又使用 `_controllers`。
- 原命名规则只检查部分入口与样式约定。本轮由 [`lint/component.js`](../../lint/component.js) 统一检查有参数或公开契约时必需的类型文件、根部分组、公开类型位置和外部私有导入；旧规则已经删除。

这类分歧即使业务实现正确，仍会增加定位成本，并让每次拆分重新选择目录体系。

**已确定的标准**：正式规范见 [`component-structure.md`](component-structure.md)，以该文件为唯一来源。

- `index.tsx` 固定存在，有参数或公开类型契约时必须有 `index.type.ts`；无参且没有公开类型契约时不要求类型文件，样式按需就近。
- 私有子组件统一为 `_parts`，行为 hook 统一为 `_hooks`，内部共享能力及共享样式统一为 `_common`。
- part 递归使用同一模板；Controller 仍表示行为职责，其实现归入 `_hooks`。
- 目录本身表达私有边界；外部不深导入 `_parts`、`_hooks`、`_common`，也不创建旧路径转发。
- 组件内部 Context／store 归入 `_common` 的专用模块，继续遵守其状态与生命周期契约；非组件模块不为套模板改名。

**自动约束与迁移**：`pnpm lint:component` 与默认 `pnpm lint` 已使用同一套 error 规则。已机械迁移固定类型契约、_parts/_hooks/_common 分组和样式引用；compound 组件、深层编辑器插件、跨 owner 状态协议在 [`component-todos.js`](../../lint/component-todos.js) 中按文件和具体诊断登记。新违规继续阻塞，已解决诊断必须删除 TODO。规则覆盖及 Review 边界见正式规范。

**优先级：前置批次。** 首批目录迁移与 lint 已落地；剩余结构 TODO 应逐项收束，C14 的行为与副作用治理仍未完成。

### C14｜组件、hook 与副作用的职责

**统一的责任**：什么留在渲染入口，什么形成行为 hook，什么属于外部系统的同步与释放，以及开发者如何选择。

**跨模块写法分歧**：

- [`component-react.md`](component-react.md) 禁止新增原始 `useEffect`，同时建议生命周期 hook 与领域 hook；[`project-rules.js`](../../eslint-rules/project-rules.js) 的现有检查按调用名称标记 warning，不能判断抽出后是否真正建立职责边界。
- [`Chat`](../../src/components/business/Chat/index.tsx) 顶层通过 effect 协调会话和对话状态；[`ChatInput`](../../src/components/business/Chat/_parts/ChatConversation/_parts/ChatInput/index.tsx) 又直接管理 ResizeObserver 和引导注册。
- [`useEditorRuntime`](../../src/components/editors/_runtime/useEditorRuntime.ts) 集中注册与释放会话；[`useDesktopWindowState`](../../src/hooks/useDesktopWindowState.ts) 使用订阅快照；[`useResizablePanelSize`](../../src/hooks/useResizablePanelSize.ts) 持有第三方实例同步与动画。不同职责不能仅按是否含 `useEffect` 选择迁移方法。

**目标契约**：

- 组件入口保留 JSX、简单局部状态、轻量派生和能力编排；复杂行为按完整状态、动作、异步与清理抽入 `_hooks`，不形成总 Controller。
- 事件触发的工作沿事件链执行；可由输入计算的数据在渲染或纯模型中派生，不通过 effect 链维护副本。
- 请求消费 C03 的统一查询协议；外部状态使用适合的订阅接口；第三方实例、DOM、连接和计时资源由明确适配能力拥有，按 C02 失效和释放。
- 不把 `useEffect` 机械替换成 `useMount`，不以稳定回调、最新值 ref 或自定义 hook 名称掩盖错误的数据流；依赖变化是否应重建资源要有明确契约。
- 正式落地前明确底层同步能力的允许范围，再对应修改副作用规则；仅把 effect 搬入 `_hooks` 不足以完成本项。

**自动约束**：利用 C13 的结构约束区分组件入口、行为 hook 和底层适配，检查实际导入绑定、别名和依赖，不仅匹配函数名字。依赖完整性、禁止的旁路与私有导入可以机械检查；是否值得抽 hook、某次同步是否有真实外部系统仍需职责审查。

**迁移删除**：重复状态同步、拆散同一行为的 effect 链、只有生命周期名的转发 hook 和根部散落的业务 hook。当前副作用规范尚未在本项中改写。

**优先级：接续 C13，与 C01–C03 协同。** 先统一结构位置，再统一这些位置承担的状态与副作用责任。

## 四、实施顺序与验收方式

C13 已完成首批组件结构迁移与门禁。继续清理具名结构 TODO，并接续 **C14 的 hook／副作用责任**；目录移动本身不代表复杂逻辑治理完成。

第一批不表示同时启动全部大改。与组件规范协同，先完成 **C01 的调用契约**，再依次推进 **C02 的任务有效期、C03 的查询协议、C05 的表单协议**。C06 的依赖边界、C08 的公共数据边界可以在独立范围推进；共享文件发生重叠时串行迁移。

第二批推进 C04、C07，以及可独立工作的 C09、C10。C04 依赖前面已经说清楚的等待、失效和读取责任；C07 则把任务失效与本地资源清理接起来。第三批完成 C11、C12 这类范围较窄但确有竞争写法的项目。这里没有因 C02、C08 迁移面大而绕过它们。

各项之间通过问题边界区分，避免重复造公共入口：

| 边界问题                                      | 归属 |
| --------------------------------------------- | ---- |
| 谁等待这个 Promise，谁消费拒绝？              | C01  |
| 这个任务现在还有资格写回吗？                  | C02  |
| 读取结果及分页如何表达和消费？                | C03  |
| 写入成功后，哪些读模型收到变更？              | C04  |
| 表单用户何时看到错误、如何退出草稿？          | C05  |
| 两个 owner 通过什么公开协议依赖？             | C06  |
| 本地存储如何被发现、释放和清理？              | C07  |
| 任意组件的类型、逻辑和共享内容去哪里找？      | C13  |
| 什么留在组件，什么抽成 hook，副作用由谁拥有？ | C14  |

每项按同一套交付步骤推进：

1. **冻结契约**：列出责任、允许变体与禁止写法，确认涉及的业务不变量，更新该关注面的唯一规范。
2. **实现公共能力和生产范例**：至少覆盖不同模块的主要调用形态。不能只抽出一层 wrapper，内部继续让每个调用方决定同一套工程机制。
3. **按责任迁移存量**：列清范围、旧入口和消费者，迁移后删除旧路径。拆批时可以按明确调用类型划边界，例外必须具名、说明理由及退出条件。
4. **封住回流**：规则先在迁移过程中提供线索；本批范围完成后接入默认 CI 的阻塞检查，不以永久 warning 或越来越长的 allowlist 代替迁移。
5. **验证语义**：类型和 lint 证明调用形态，业务描述及针对性验证保护行为。针对性验证不默认等于新增一套长期维护的逐业务测试。

验收时不能只统计“文档写了、公共 hook 有了、warning 少了”。应能回答：新业务开发者是否还有两套同等合法的入口可抄？旧写法是否还会被默认 CI 放行？例外是否表达真实语义差异？

项目正在维护的业务描述可以直接成为语义验收来源。例如 C02 描述切换资源后旧结果不得写回，C04 描述已提交命令不会因刷新失败被重复提交，C05 描述失败后保留草稿，C09 描述每个动作的准入条件。工程契约统一这些不变量的实现责任，业务描述确认每个业务的具体含义。

## 五、本轮不另立项目的方向

以下判断表示本次未找到足够的项目级竞争范式证据，不代表永远不需要改：

| 方向                                   | 当前判断                                                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 全面重做 API／Schema／ID               | 已有统一 Contract、执行器和绕过检查；本轮子 agent 检查得到 154 个 Contract、0 重复 endpoint、无绕过。应继续既有路线，公共输出边界单列 C08 |
| 全项目 null／undefined 归一            | omitted、清空、继承可能有不同含义；先按边界契约处理，不能为统一写法抹去语义                                                               |
| Context 模板与实例 store 再造          | 已有组成、归属和 Provider 规范；本轮主要缺口由 C06 的跨 owner 依赖约束覆盖                                                                |
| Overlay 全面重构                       | 已有分层、关闭消费和导入边界；不足以再立一项横跨全仓的浮层重构                                                                            |
| 全面文件 I/O／下载                     | 局部重复不足以证明全项目存在同一责任的竞争协议；Blob URL 的释放也多已有归属。保留证据明确的 C11                                           |
| 外链与分享统一入口                     | 原生锚点、`window.open`、Electron 拦截可能承担不同责任，先明确场景，不根据 API 不同直接判定混乱                                           |
| 第三方适配全面重做                     | 局部强转和观察器重复可单独治理，本轮不足以证明需要项目级适配框架                                                                          |
| 单业务状态机、个别大文件、单个接口债务 | 不符合本清单单位；回到业务或既有 roadmap 处理，不能为凑项数放进来                                                                         |

## 六、扫描和验证记录

- 扫描日期：2026-11-28；代码参考提交：`4081c08e`，分支 `refactor/error`。文中代码行号均指该快照，后续漂移以链接文件中的对应符号为准。
- 范围：`src`、`agent/docs`、自定义 ESLint 与相关检查和 CI 入口。结合符号搜索、跨模块样本阅读及三个只读子 agent 的分工扫描；并非逐行人工审查全仓，也不声称列尽所有调用。
- 主线已执行 `pnpm exec eslint src --format json --no-cache`：1454 个文件，0 error、359 warning。Promise 相关两条规则合计 85 条 warning；数字只用于定位，不是本清单的缺陷统计。
- 领域子 agent 已执行 API Contract 和 Domain 边界检查并通过；API 检查统计为 154 个 Contract、0 重复 endpoint、无绕过。不是本轮重新执行完整 `pnpm verify:ci` 的结果。
- 初次扫描只新增清单与索引；随后补充 C13、C14。本轮 C13 正式落地文档、阻塞 lint 和组件类型／目录机械迁移：375 个识别入口均补齐类型文件；随后按约定豁免无参且无公开类型契约的组件，并清除其空类型文件；134 个复杂文件的 346 条具体诊断保留在具名 TODO 清单，新增违规继续阻塞。未新增常驻测试。
- C13 迁移验证：`pnpm lint` 通过（0 error、361 warning，warning 来自其它既有治理规则）；`pnpm typecheck`、`pnpm build:app`、`pnpm check:ci` 均通过。CI 检查包含 46 项现有测试、组件契约 0 命中、154 个 API Contract、Domain 边界和三项样式 token 检查。构建仍有包体积 warning。
- 一次性规则探针覆盖类型文件副作用、类型入口、目录、私有导入、样式、包装别名、无界面组件与 TODO 增减／文件删除。运行代码 AST 等价检查通过：归一化类型擦除、模块路径、导入／再导出顺序与格式后，408 个变更文件无运行代码差异。临时脚本留在仓库外。
- 未启动 dev／mock／浏览器，未做页面交互和视觉回归。目录检查不验证业务关键路径，也不代表 C14 的状态与副作用职责已经完成；复杂 owner 调整仍按 TODO 单独审查。
