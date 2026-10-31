# Admin 领域业务知识

> Canonical owner：`src/domains/Admin`

## 范围

本文件拥有管理端账号服务语义；管理入口由 [管理 workflow](../../views/admin/BUSINESS.md) 拥有。系统身份与账号资料由 [User](../User/BUSINESS.md)、会话由 [Auth](../Auth/BUSINESS.md)、个人通知由 [Message](../Message/BUSINESS.md) 拥有。

## 账号服务与能力边界

- 账号基本资料修改、profile 修改与重设密码是分别调用的 service 方法，不构成一次原子更新；重设时只在 caller 提供 newPassword 才送出，不由前端订出省略时的默认密码规则。服务存在不代表用户管理 UI 已接线或具备后端授权。依据：[createAdminServices](service/AdminServices.impl.ts)、[mapResetAdminUserPasswordRequest](mapper/AdminUserServices.map.ts)、[管理 workflow](../../views/admin/BUSINESS.md)。
- Admin mapper 沿用 User 的 enum 转换，不能另订系统身份或 status 的语义；管理服务的查询结果不等于一般登录会话或目前用户缓存。依据：[AdminUserServicesMap](mapper/AdminUserServices.map.ts)、[User](../User/BUSINESS.md)。

## Mock 限制

- Admin User mock 的修改与重设是 no-op，成功响应不验证持久化、账号修改或密码变更。依据：[AdminUserApi](mock/AdminUserApi.mock.ts)。
