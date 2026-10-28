# 共用管理工作流程业务知识

> Canonical owner：`src/views/admin`

## 范围

本文件拥有管理入口与公告互动，不为 guard、modal 或未接线页面另建 owner。公告请求及发布纪录由 [Admin domain](../../domains/Admin/BUSINESS.md) 拥有；一般路由组织由 [routing 规范](../../../agent/docs/routing.md) 拥有。

## 入口与身份

- 管理路由与侧栏管理入口使用系统 `IDENTITY.ADMIN`，不是群组 ADMIN。guard 等待用户信息，非管理员导向 Chat；认证异常沿用既有 [Auth](../../domains/Auth/BUSINESS.md) 流程。此 gate 不证明后端授权，也不保证每次进页都绕过 [User 缓存](../../domains/User/BUSINESS.md) 刷新。依据：[AdminRouteGuard](guard/AdminRouteGuard.tsx)、[UserProfile](../../components/business/Sidebar/_common/footer/UserProfile/index.tsx)。

## 公告表单与列表

- 标题／内容须 trim 后非空，但请求保留输入原值；DIRECT 至少一个 receiver。receiver 以中英文逗号／分号或空白分隔并滤空，不去重，也不验证账号是否存在。切换 ALL_USERS 隐藏字段而不清除已填 receiver，仍会送出解析结果；类型规则只由 Admin domain 定义。依据：[CreateAnnouncementModal](AnnouncementManagement/CreateAnnouncementModal/index.tsx)、[parseReceiverUserIds](AnnouncementManagement/CreateAnnouncementModal/index.tsx)、[公告请求规则](../../domains/Admin/BUSINESS.md)。
- 请求成功才提示、重设表单、关闭并调用列表刷新；在第一页直接刷新，其他页回第一页再加载。失败不走成功 callback，不是乐观发布，也不证明公告已送达。依据：[CreateAnnouncementModal](AnnouncementManagement/CreateAnnouncementModal/index.tsx)、[AnnouncementManagement](AnnouncementManagement/index.tsx)。
- 取消或允许的关闭会丢弃表单；提交中禁止 dismiss／取消，避免把关闭误当成取消已送出的发布。依据：[CreateAnnouncementModal](AnnouncementManagement/CreateAnnouncementModal/index.tsx)、[AppFormDialog](../../components/business/AppFormDialog/index.tsx)。
- 列表可展示未知类型／范围的原字符串及 readCount，这不扩大表单的发布能力；管理端发布纪录与个人收件匣是不同 owner，不把列表数字当作个人已读。依据：[AnnouncementManagement](AnnouncementManagement/index.tsx)、[Admin domain](../../domains/Admin/BUSINESS.md)、[Message](../../domains/Message/BUSINESS.md)。

## 尚未接线的管理能力

- 目前只有公告列表与发布使用 Admin service。其他八页只有 AdminPageHeader： [DataStatistics](DataStatistics/index.tsx)、[UserManagement](UserManagement/index.tsx)、[ResourceManagement](ResourceManagement/index.tsx)、[GroupManagement](GroupManagement/index.tsx)、[PermissionManagement](PermissionManagement/index.tsx)、[TaskCenter](TaskCenter/index.tsx)、[LogAudit](LogAudit/index.tsx)、[SystemSettings](SystemSettings/index.tsx)。导航与页面存在不代表具有统计、用户编辑、资源治理、权限管理或其他正式能力。
- 账号修改／reset 的 service 与 mock 限制由 [Admin domain](../../domains/Admin/BUSINESS.md) 拥有；不要以管理页标题或 mock 成功响应补写默认密码、原子性或正式后端能力。
