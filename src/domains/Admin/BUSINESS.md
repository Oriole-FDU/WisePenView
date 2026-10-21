# Admin 领域业务知识

> Canonical owner：`src/domains/Admin`

## 范围

本文件拥有管理端公告请求与发布纪录语义；入口及公告表单由 [管理 workflow](../../views/admin/BUSINESS.md) 拥有。系统身分与帐号资料由 [User](../User/BUSINESS.md)、会话由 [Auth](../Auth/BUSINESS.md)、个人通知由 [Message](../Message/BUSINESS.md) 拥有。

## 公告与发布纪录

- ALL_USERS 发送强制使用 SYSTEM，DIRECT 才保留 caller 的可发布类型；mapper 不替 ALL_USERS 清空 receiverUserIds。请求可发布类型只有 SYSTEM／NORMAL，不能从列表可展示 GROUP 或其他字串推论表单也能发布。依据：[mapPublishMessageRequest](mapper/AdminMessageServices.map.ts)、[PublishMessageType](service/index.type.ts)、[AdminMessage](entity/message.ts)。
- 管理列表是发布纪录，readCount 缺值降为零；它不是收件匣的个人 readTime，也不是每位收件者状态或已送达人数。前端没有由此推导广播完成或阅读统计正确性的依据。依据：[mapAdminMessageApiModelToEntity](mapper/AdminMessageServices.map.ts)、[listAdminMessages](service/AdminServices.impl.ts)、[个人通知规则](../Message/BUSINESS.md)。

## 帐号服务与能力边界

- 帐号基本资料修改、profile 修改与重设密码是分别呼叫的 service 方法，不构成一次原子更新；重设时只在 caller 提供 newPassword 才送出，不由前端订出省略时的预设密码规则。服务存在不代表使用者管理 UI 已接线或具备后端授权。依据：[createAdminServices](service/AdminServices.impl.ts)、[mapResetAdminUserPasswordRequest](mapper/AdminUserServices.map.ts)、[管理 workflow](../../views/admin/BUSINESS.md)。
- Admin mapper 沿用 User 的 enum 转换，不能另订系统身分或 status 的语义；管理服务的查询结果不等于一般登入会话或目前使用者快取。依据：[AdminUserServicesMap](mapper/AdminUserServices.map.ts)、[User](../User/BUSINESS.md)。

## Mock 限制

- Admin Message mock 的发布是 no-op、列表为固定样本；Admin User mock 的修改与重设也是 no-op。这些成功回应不验证持久化、帐号修改、密码变更、全员广播或阅读统计。依据：[AdminMessageApi](mock/AdminMessageApi.mock.ts)、[AdminUserApi](mock/AdminUserApi.mock.ts)。
