# UserVerification 领域业务知识

> Canonical owner：`src/domains/UserVerification`

## 范围

本文件拥有邮箱验证与校园身份 Provider 的发起、挑战与状态查询语义。账号页和 AuthBindingOnboarding 的展示流程由对应 view 拥有；User 资料中的认证字段只表示已归一化的展示状态。

## 认证规则

- 邮箱验证拆成发起与 token 确认两个步骤，发起参数是完整邮箱，确认参数是不透明 token。依据：[UserVerificationApi](apis/UserVerificationApi.ts)。
- 校园身份验证使用 Provider 发起与状态轮询；`requireAction` 表示仍需用户操作，`actionPayload` 是受控的二维码载荷。前端不从 completed 之前的空载荷推断失败。依据：[UserVerificationServicesMap](mapper/UserVerificationServices.map.ts)。
- UIS 接口已标记为将被通用 Campus Identity API 替代；当前实现保留仅为现有流程兼容，不继续扩展专属字段。

## 证据限制

mock 轮询只用于离线状态切换，不证明正式 Provider 的凭证安全、二维码有效期或账号绑定策略。
