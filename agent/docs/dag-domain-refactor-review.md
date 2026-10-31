# DAG 前序领域重构审查

> 审查日期：2026-10-31
>
> 审查基线：`refactor/schema-contract-roadmap` 的 `6239e192b`，相对 `origin/main` 的 `5f444bf4e` 共 45 个未 push commit、414 个文件。
>
> 范围重点：DAG 前序 AccessPolicy、UserInformation、Tag、Group、ResourceCore，以及本轮拆出的 ResourceAccess、ResourceComment、ResourceFavorite、ResourceInteraction、ChatConfig、ChatSession、ChatTurn、UserTask、UserTour、UserVerification。

## 一、结论

这批改动的总体方向与历史讨论一致：先把后端 wire 收紧为单一事实源，再让 service 和 mapper 只处理真实业务语义；拆域依据独立生命周期而不是 endpoint 数量；跨域聚合由 registry 注入。AccessPolicy、UserInformation、Tag、Group、ResourceCore 的主体边界已经清晰，后续拆域也没有出现明显的 service 实现级循环。

本轮已修复 7 类低风险或无决策依赖的问题：

1. 删除所有接口 Contract 化后已经失效的 `parseResourceActions` 兼容入口。
2. 删除 0 个存量调用仍在使用的 unchecked transport 和 `NumericEnumApiValue`。
3. User、Admin、Group、Resource 的 API 枚举改为从既有 `defineEnum` 派生，避免 Schema 与领域枚举各维护一份值表。
4. IdentityType 的 wire 值与领域值一致，删除无意义的 `Number()` 转换。
5. ResourceAction 的 key 与 value 一致，删除 `getOption(...) ?? String(action)` 式的反向查找与伪 fallback。
6. ResourceAccess 的资源类型分派由嵌套三元改为显式 `switch`，未知类型不再静默落到 HtmlPage。
7. 清理 `executeApiContract` 的恒真条件，并禁止普通执行器误执行 SSE Contract。

仍有需要产品、后端或权限语义确认的高风险项，主要集中在权限补全失败策略、分页过滤语义、跨请求事务和正式环境响应兼容。本轮没有擅自改变这些行为。

## 二、从历史聊天提炼的稳定偏好

已重点核对以下历史会话：

- `规划 API 域 Zod Schema 建设 DAG`
- `优化 DAG 分步验收流程`
- `实现 A AccessPolicy`
- `实现 U UserDirectory`
- `推进 tag domain schema 建设`
- `建设 Group 域 Schema 契约`
- `收敛 createEnum 枚举元数据 API`
- enum PR、Tag PR、Group PR 的返工和 Review 对话
- 本次完成 Schema Contract Roadmap 的长任务

### 1. 核心担忧

- 担心一次性改得太大，人只能从头重读 diff，AI“完成”却不能证明真的可验收。
- 担心手写类型、宽松 optional/nullable 和 mapper fallback 把后端契约问题藏到 UI 才爆。
- 担心为了目录对称拆出薄 domain、薄 mapper、薄 wrapper，最后入口更多但责任更模糊。
- 担心同一个概念有多条访问路径，调用方不知道哪条是推荐入口。
- 担心测试只是证明“这次改动能跑”的临时脚手架，而不是长期契约或行为回归。
- 担心 mock 通过、类型通过，却掩盖真实后端未上线、字段不一致或缺少运行态验证。

### 2. 审查习惯

- 先确认权威事实源：后端 DTO/Controller、路由行为、已有领域规则，而不是从旧前端类型反推。
- 先圈定一个可独立验收的切片，再在这个切片内部小步实现和自测；不是让人参与每个微小迭代。
- 先看责任边界、数据所有权、错误语义和依赖方向，再看行数与形式。
- 接口字段无法确定时停下来确认，不用 `?.`、默认值、`unknown` 或兼容分支掩盖。
- 后端能力未上线时，不把“前端已经接了”当成完成；宁可暂时删除入口。
- 只把实际执行过的检查记为通过，运行态和环境风险单独列出。
- Review 评论按“必须修复 / 建议修改 / 需要确认 / 超出范围”分类，让每条意见能对应文件、修改和验证。

### 3. 代码风格

enum 重构是最有代表性的样本：

- `defineEnum` 只负责前端枚举常量、顺序、直接属性、`getOption` 和 `isValue`。
- 删除 `labels`、`keyLabels`、`configs`、`values`、`getLabel`、`getKey` 等重叠 API。
- 一个概念只有一条主路径；没有真实消费者就不保留“以后可能用到”的出口。
- wire 与领域值相同时直接使用值，不再 `options.find`、`byKey` 或做表示转换。
- wire 与领域值不同时，映射必须显式且集中；例如数字 `ROLE` 对领域 key，数字 `IDENTITY` 对 query enum key。
- 需要 Zod 时从同一 `defineEnum.options` 派生 Schema，不复制第二个值数组。
- 名字表达职责，`executeApiContract` 优于把 JSON transport 和“call contract”混在公共名字里。

推广到整个 domain：

- Domain 的最低粒度是一组完整 CRUD、命令/查询能力，或等价的内聚生命周期；单接口能力留在父域。
- Mapper 只保留字段改名、枚举/时间/ID 归一、协议 fallback、安全转换等真实语义。
- API 是协议薄层，Service 是业务编排，Entity 是稳定前端模型，组件不消费 raw DTO。
- 共享逻辑放在最近的现有共同层，不先创建通用框架；简单优先于形式统一。
- 删除旧实现时同时删除调用点、导出、测试和文档，不保留双路径。

## 三、当前 DAG 前序领域审查

### AccessPolicy

结论：职责与依赖方向正确，ResourceAction/AccessControlScope 已成为共享词汇；Resource、Tag、Group 不再各自复制权限动作。

已修复：

- 删除 `AccessPolicy.parser.ts`。所有消费方已经通过 API Contract 校验，继续保留临时 parser 会形成第二套 wire 校验路径。
- ResourceAction 的 value 与 key 相同，权限选项直接使用 action，不再查反向映射。

保留决策：

- `MARKET_VIEW` 参与权限判断但不进入普通权限编辑器，这一分级规则应继续由 `_shared/access` 拥有。
- 各资源类型支持哪些动作仍留在 ResourceAccess，不塞回共享 AccessPolicy。

### UserInformation

结论：搜索摘要、账号详情、只读字段和枚举已从历史宽松 DTO 收敛；UserSummary 与 AccountProfile 的职责可区分。

已修复：

- `IDENTITY`、`SEX`、`USER_STATUS`、`USER_VERIFICATION`、`DEGREE`、`USER_READONLY_FIELD`、`USER_INVITE_STATUS` 成为枚举事实源，Schema 从中派生。
- IdentityType wire 与领域值同为 1/2/3，删除 `Number(value)` 转换。
- Admin 的 identity query Schema 从 `IDENTITY` keys 派生，不再复制 `STUDENT / TEACHER / ADMIN`。

保留风险：

- `readonlyFields` 的 wire 枚举不包含 UI 的 `nickname`、`academicTitle` 等检查项，因此 entity 仍保留 `string[]`。这是刻意避免把“后端 readonly 列表”误当成完整表单字段枚举。
- `updateUserInfo` 仍按 `userInfo` 与 `userProfile` 两次 PUT，非原子；见 roadmap B7。

### Tag

结论：TagTree、Policy、Command 和当前通用树接口的边界清楚；scoped endpoint 已从前端删除，避免了后端未上线能力被误用。

保留风险：

- “后端尚未上线”继续是硬阻塞。不要把已删除的 `getPersonalTagTree` / `getGroupTagTree` 以隐藏 API 或临时 service 分支重新引入。
- `tagMetaInfo` 仍是 v1 JSON 字符串；未知扩展保留、非法 JSON 按未设置处理有明确业务理由，不应在没有 metadata v2 决策时升级为任意结构化主字段。
- 通用 `getTagTree` 是当前唯一线上入口；等 scoped endpoint 正式上线后再做单次替换，不保留三套读取路径。

### Group

结论：Group、Member、ResConfig 是同一领域内的不同能力，不需要机械拆 domain。数字 GroupType/Role、字符串 query enum、毫秒时间和 Integer 配额已与后端对齐。

已修复：

- GroupType、query GroupType、Role、RoleFilter、FileOrgLogic 均由 `defineEnum` 所有，Schema 从 options 派生。
- `GROUP_ROLE_FILTER_MAP` 改为真正的 `GROUP_ROLE_FILTER` 枚举，删除宽泛 `Record<string, ...>`。

高风险或待决策：

- `fetchUserGroupQuotas` 只返回 ADVANCED 小组，却沿用后端全量 `total`。当分页混有其他小组类型时，前端分页总数和实际行数不一致。需要产品/后端决定是在查询层过滤，还是前端重新分页；本轮不改。
- `createGroup` 依次执行 addGroup、getConfig、changeConfig。后两步失败时，小组已创建但默认成员权限可能未写入。需要后端事务化创建命令；本轮不通过前端补偿伪装原子性。
- GroupMember/owner mapper 仍把缺失昵称、姓名、头像降级为空串或空对象。它可能是展示约定，但会掩盖后端 null 漂移；需要 UI 决定统一占位规则后集中处理。
- `groupMetaInfo` 非法 JSON 当前静默降级为 `{}`。是否需要 fail-fast 取决于历史数据兼容窗口。

### ResourceCore 与资源叶域

结论：ResourceCore 已不再认识 Agent/Document/Note/Skill 等叶域；ResourceAccess 成为上层聚合器，依赖方向正确。ResourceItem 仍是跨叶域最宽的共享类型，是后续主要维护风险。

已修复：

- ResourceType、Sort、TagQueryLogic、SearchScope 从 `defineEnum` 派生，Schema 不再复制值表。
- Resource/Note/Skill mapper 直接归一化已经通过 Contract 的 actions，不再二次 parse。
- ResourceAccess 对资源类型使用显式分支；不能识别的类型 fail-fast，不再默认查询 HtmlPage。

高风险或待决策：

- `loadPermissionGroupInfo` 和 `loadPermissionInheritedActions` 使用 `.catch(() => undefined)` 吞掉 Group/Tag 查询失败。权限面板可能在缺少继承权限或小组展示信息时继续渲染。必须明确是“降级但可见”还是“权限信息不完整必须失败”；这是安全/产品决策，本轮不改。
- `ResourceSummary` 尚未收敛，Agent、Document、HtmlPage、Note、Skill、Favorite 仍穿透完整 ResourceItem。roadmap F1 已记录，不宜在当前批次继续扩大。
- 后端 `ResourceItemResponse` 仍包含 `marketSaleInfos`，当前消费 Schema 会剥离该字段。若 Market 进入范围，必须建立正式消费边界，不能长期静默丢弃。
- `ResourceItem.ownerInfo`、size、计数在 mapper 中仍有展示默认值。它们不像权限动作那样影响授权，但应在运行态样本稳定后统一判断是否保留。

### 后续拆域

结论：当前拆域总体符合“独立生命周期”门槛，没有发现需要立即合并的薄 domain。

- `ChatSession` 拥有会话、历史和附件；`ChatTurn` 拥有单轮流式生命周期；`ChatConfig` 拥有模型、工具与输入能力。三者变化原因和状态所有权不同，拆开合理。
- `UserTask`、`UserTour`、`UserVerification` 都有不能与账号资料混用的状态生命周期，保留独立 domain 合理。
- `ResourceComment`、`ResourceFavorite`、`ResourceInteraction` 虽然都围绕 Resource，但分别拥有评论、收藏归属、阅读/点赞/评分状态；依赖方向已由 boundary check 固化，当前不合并。
- `Feedback`、`UserInvite` 作为单接口能力曾被拆出，后来已收拢回 User，符合最低粒度规则。

## 四、代码风格与可维护性问题

### 已修复

| 问题                                                | 处理                               | 结果                             |
| --------------------------------------------------- | ---------------------------------- | -------------------------------- |
| Contract 化完成后仍保留 `parseResourceActions`      | 删除 parser 与全部调用             | wire 校验只在 Contract 边界发生  |
| 0 unchecked 调用仍保留四个 deprecated transport     | 删除公共函数与数字枚举兼容类型     | 不再提供绕过 Contract 的顺手入口 |
| Schema 与 `defineEnum` 各存一份枚举值               | User/Admin/Group/Resource 全部派生 | 枚举变更只需改一处               |
| IdentityType 的 `Number()` 什么也没转换             | 直接使用已校验值                   | 删除伪归一化 mapper 逻辑         |
| ResourceAction 同值时仍做反向查找和 String fallback | 直接使用 action                    | 删除不可达 fallback              |
| ResourceAccess 用嵌套三元选择叶域                   | 改为显式 switch + 未知类型报错     | 新增类型必须显式接线             |
| JSON 执行器内存在 `method === 'POST'` 恒真条件      | 直接传 body，并加 transport guard  | 执行路径更窄、更直白             |
| ChatConfig BUSINESS 仍链接已删除的 Chat domain      | 改链 ChatSession/ChatTurn          | 业务知识导航有效                 |

### 暂不处理

| 问题                                                      | 原因                                                         | 建议                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------- |
| 每个契约测试重复 esbuild bootstrap                        | 测试是长期回归，不是临时脚手架；当前仍可维护                 | 单独做测试基建收口，避免在这轮功能审查中改 20+ 测试文件 |
| `ResourceServicesMap` 只是命名函数集合的外壳              | 所有 Resource 叶域通过它形成稳定 mapper 入口，当前有统一价值 | 若后续确认没有跨域 API 价值，再整体改为直接 import 函数 |
| Registry type、hook、index 有多处重复列表                 | 类型安全与 React hook 入口存在实际约束                       | 不建议为减少行数引入动态 key 或反射                     |
| 大量响应 Schema 为严格必填，而 Java DTO 未用 NonNull 注解 | 类型声明不能证明真实 payload                                 | 用正式后端/联调样本验证，不能退回全 optional            |

## 五、需要你回来决策或协调的事项

按风险排序：

1. **权限聚合失败策略**：Group/Tag 补全失败时当前继续渲染。要选择 fail-closed、部分数据明确标注，或保持静默降级。
2. **Group 配额分页语义**：只展示 ADVANCED 时，总数应由后端按同一条件返回，还是前端重新分页。
3. **Group 创建事务**：是否需要后端提供单一事务化“创建小组并初始化默认权限”命令。
4. **ResourceSummary**：在 Access、Favorite、Note 等上层仍消费完整 ResourceItem 时，先冻结摘要字段还是等后端聚合接口。
5. **正式后端样本验证**：当前只证明 Schema 与 DTO 源码、mock、测试一致，没有证明线上数据一定满足严格 Schema。
6. **Tag scoped endpoint 上线顺序**：后端分支合入和生产可用是删除通用树依赖的前置条件。

## 六、验证记录

本轮修复实际执行并通过的检查记录在交付说明中；未执行的浏览器、mock 运行态和正式后端联调不会被写成已验证。
