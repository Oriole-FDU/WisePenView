# UserInvite 领域业务知识

> Canonical owner：`src/domains/UserInvite`

## 范围

本文件拥有当前用户发出的邀请记录与状态语义。个人邀请码属于当前用户资料，由 [User](../User/BUSINESS.md) 提供；邀请弹窗流程由 [UserInviteModal](../../components/business/Sidebar/_common/footer/UserInviteModal/index.tsx) 拥有。

## 记录规则

- 邀请记录按页读取；`BOUND` 表示关系已绑定，`REWARDED` 表示奖励已发放，奖励结算时点不由前端推定。
- 邀请码来自用户资料，而记录来自邀请 API；两者生命周期不同，不能用记录为空证明用户没有邀请码。
