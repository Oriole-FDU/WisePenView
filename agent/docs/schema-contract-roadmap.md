# 契约与边界剩余工作

> 本文件只记录未完成工作。已完成迁移、历史波次、逐接口完成矩阵和 review 过程以 Git 历史为准。
>
> 当前事实：154 个 checked Contract，2 个 unchecked REST endpoint，0 个 direct fetch。两个 unchecked endpoint 都位于 Admin 公告 API。

## 一、计数口径

- **Contract 缺口：2 个 endpoint。** 只有 `/admin/message/listMessages` 和 `/admin/message/publishMessage` 尚未迁移。
- **待办 track：18 项。** 按可独立验收的能力或决策计数，不把一组 CRUD 内的每个 endpoint 重复计数。
- 其中：后端/协议依赖 9 项、前端边界债务 2 项、运行态验证 1 项、业务决策 6 项。

## 二、后端或协议依赖

| ID  | 未完成项                    | 当前阻塞                                                         | 完成条件                                                                                                   | 证据                                                                                                                                                                                                         |
| --- | --------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | Admin 公告 Contract         | 后端没有受管理员权限保护的公告 Controller、DTO 与数据源          | 提供分页列表和发布命令后迁移 2 个 endpoint，使 unchecked 基线降为 0；若功能取消则删除前端页面、API 与 mock | [AdminMessageApi.ts](../../src/domains/Admin/apis/AdminMessageApi.ts)                                                                                                                                        |
| B2  | Admin 重置密码语义          | `newPassword` 省略时使用系统默认密码，omitted 语义不够明确       | 后端改为显式模式，例如 `strategy: DEFAULT / CUSTOM`；前端 Contract 与确认文案同步                          | [AdminUserApi.schema.ts](../../src/domains/Admin/apis/AdminUserApi.schema.ts)                                                                                                                                |
| B3  | 按 scope 读取 Tag 树        | scoped personal/group Tag endpoint 尚未提供                      | 后端上线后迁移个人与小组树读取，删除通用树依赖并补权限/空树回归                                            | [TagApi.contract.ts](../../src/domains/Tag/apis/TagApi.contract.ts)                                                                                                                                          |
| B4  | Resource Access Overview    | 后端没有一个聚合响应替代按资源类型查询详情和补 Group/Tag 的操作  | 提供 owner/group/tag/override/specified-user 及 effective/editable/inherited actions 后删除前端补全 mapper | [ResourceAccessServices.impl.ts](../../src/domains/ResourceAccess/service/ResourceAccessServices.impl.ts)                                                                                                    |
| B5  | Campus Identity 通用认证    | 当前仍使用标为 Deprecated 的 Fudan UIS 专属接口                  | Provider 列表、发起、Challenge 与状态查询全部迁移到通用 Campus Identity API，再删除 UIS 专属字段           | [UserVerificationApi.contract.ts](../../src/domains/UserVerification/apis/UserVerificationApi.contract.ts)                                                                                                   |
| B6  | 点赞 desired-state Contract | 资源点赞与评论点赞仍是 toggle；评论点赞依赖响应返回 boolean      | 提供幂等 `{ liked: boolean }` 命令，迁移资源赞与评论赞，旧 toggle 只保留明确退场期                         | [ResourceInteractionApi.contract.ts](../../src/domains/ResourceInteraction/apis/ResourceInteractionApi.contract.ts)、[CommentApi.contract.ts](../../src/domains/ResourceComment/apis/CommentApi.contract.ts) |
| B7  | Placement 批量逐项结果      | 挂载、卸载、移动只返回影响数量，客户端无法知道部分失败项         | 新的批量命令返回每项 success/errorCode；Drive 与 Course 改消费逐项结果                                     | [ResourcePlacementApi.contract.ts](../../src/domains/Resource/apis/ResourcePlacementApi.contract.ts)                                                                                                         |
| B8  | 用户资料原子更新            | `userInfo` 与 `userProfile` 仍是两次 PUT，失败时可能只更新一部分 | 提供 PATCH/JSON Merge Patch 或单一事务命令，明确 omitted 与 null；前端一次提交并刷新一次                   | [UserServices.impl.ts](../../src/domains/User/service/UserServices.impl.ts)、[AccountApi.contract.ts](../../src/domains/User/apis/AccountApi.contract.ts)                                                    |
| B9  | Feedback v2                 | 当前单类型提交模型限制了多类型反馈                               | 后端提供 `types: FeedbackType[]` 的新 DTO；前端表单、Schema、mock 与测试一起迁移                           | [AccountApi.contract.ts](../../src/domains/User/apis/AccountApi.contract.ts)                                                                                                                                 |

## 三、前端可以直接推进

| ID  | 未完成项             | 当前问题                                                                                 | 完成条件                                                                                                                                                                    | 证据                                                                                                                                                                                                                                                                |
| --- | -------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | ResourceSummary 边界 | Agent、Document、HtmlPage、Note、Skill、Favorite 仍穿透完整 `ResourceItem`，跨域依赖过宽 | 定义稳定 ResourceSummary；资源叶域只消费摘要，完整 ResourceCore 类型留在 ResourceAccess 等上层聚合                                                                          | [Resource entity](../../src/domains/Resource/entity/resource.ts)                                                                                                                                                                                                    |
| F2  | 无领域语义 mapper    | 仍有只复制字段或只检查非空的 mapper，增加调用层与维护面                                  | 删除 UserInvite/UserVerification 请求复制、Message/Admin request 映射、Note title/create/fork 映射、InlineComment identity 映射、Placement count 映射和 Wallet voucher 映射 | [UserServices.map.ts](../../src/domains/User/mapper/UserServices.map.ts)、[InlineCommentServices.map.ts](../../src/domains/InlineComment/mapper/InlineCommentServices.map.ts)、[ResourceServices.map.ts](../../src/domains/Resource/mapper/ResourceServices.map.ts) |

## 四、运行态验证

| ID  | 未完成项                    | 当前阻塞               | 完成条件                                                                                             | 证据                                                                                                                             |
| --- | --------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| V1  | Chat SSE 正式后端运行态回归 | 需要明确授权的联调环境 | 覆盖正常断流、重连、active turn、取消、工具审批、坏 JSON、超限事件和终止；确认不重复连接且失败可观测 | [useChatTurn.ts](../../src/domains/ChatTurn/runtime/useChatTurn.ts)、[ChatTurn BUSINESS](../../src/domains/ChatTurn/BUSINESS.md) |

## 五、需要业务或后端先确认

| ID  | 待决策项                     | 需要确认                                                          | 关闭条件                                                                        |
| --- | ---------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| D1  | 收藏空集合语义               | `collectionIds: []` 是取消全部收藏还是无操作                      | 后端冻结语义；Schema、mapper、`BUSINESS.md` 与回归测试一致                      |
| D2  | Course 是否正式产品域        | 考试、作业、公告、成员、课程元数据的后端 owner 与事务边界         | 选择“正式 Course API”或“明确长期前端聚合”；若正式化，删除前端多次写入拼接       |
| D3  | Market 是否进入当前范围      | 是否展示/购买集市资源                                             | 若进入，建立 ResourceMarket 与稳定 Schema；若不进入，明确排除字段并避免静默丢弃 |
| D4  | Tag metadata 长期形态        | 是否允许任意扩展 JSON；若允许，schema/version 规则是什么          | 冻结版本化 metadata Contract，或迁移为已知字段并删除字符串兼容                  |
| D5  | Java 时间 wire 格式          | 长期继续 millis，还是统一 ISO 8601                                | 选择一种序列化事实；新 Contract 不混用时间类型                                  |
| D6  | Chat Provider usage 响应形态 | 统一 `usage` 对象，还是保留 input/cached/output/billable 顶层字段 | 后端冻结一种结构；Contract、mapper、fixtures 与计费展示一致                     |

## 六、建议顺序

1. 先完成 F2，这是当前唯一无需等后端、且可直接减少代码面的工作。
2. 按业务影响推进 B1、B4、B3，分别解决 unchecked Contract、权限 N+1 与 Tag 作用域。
3. B6、B7、B8、B9 属于新的写命令语义，应合并进同一轮后端 API v2 设计，避免零散新增 endpoint。
4. F1 在 ResourceSummary Contract 稳定后统一迁移，避免各叶域分别造临时类型。
5. V1 在联调环境可用后执行，不能以 mock 或静态检查替代。
6. D1-D6 应在对应后端改造开始前关闭，不能以 mapper fallback 维持不确定状态。

## 七、完成定义

一项工作只有同时满足以下条件才从本文件删除：

- Contract/类型只保留一个事实源，不再存在 checked 与 unchecked 双路径或临时 fallback。
- 调用端、mock、fixtures、回归测试和对应 `BUSINESS.md` 同步完成。
- 相关旧 endpoint、mapper、类型和兼容入口有明确删除记录。
- 对应 lint、typecheck、mock、Contract、边界测试；跨层变更还需要生产构建。
- 运行态或联调风险有实际验证记录；未验证项不能因文档复选框而关闭。
