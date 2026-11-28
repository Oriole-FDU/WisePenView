# 共用管理工作流程业务知识

> Canonical owner：`src/views/admin`

## 范围

本文件拥有管理入口与页面边界，不为 guard 或未接线页面另建 owner。账号管理服务由 [Admin domain](../../domains/Admin/BUSINESS.md) 拥有；一般路由组织由 [routing 规范](../../../agent/docs/routing.md) 拥有。

## 入口与身份

- 管理路由与侧栏管理入口使用系统 `IDENTITY.ADMIN`，不是群组 ADMIN。guard 等待用户信息，非管理员导向 Chat；认证异常沿用既有 [Auth](../../domains/Auth/BUSINESS.md) 流程。此 gate 不证明后端授权，也不保证每次进页都绕过 [User 缓存](../../domains/User/BUSINESS.md) 刷新。依据：[AdminRouteGuard](guard/AdminRouteGuard.tsx)、[UserProfile](../../components/business/Sidebar/_common/footer/UserProfile/index.tsx)。

## 尚未接线的管理能力

- 当前八页都只有 AdminPageHeader：[DataStatistics](DataStatistics/index.tsx)、[UserManagement](UserManagement/index.tsx)、[ResourceManagement](ResourceManagement/index.tsx)、[GroupManagement](GroupManagement/index.tsx)、[PermissionManagement](PermissionManagement/index.tsx)、[TaskCenter](TaskCenter/index.tsx)、[LogAudit](LogAudit/index.tsx)、[SystemSettings](SystemSettings/index.tsx)。导航与页面存在不代表具有统计、用户编辑、资源治理、权限管理或其他正式能力。
- 公告管理组件仍保留在 [AnnouncementManagement](AnnouncementManagement/index.tsx)，但未注册路由或导航，也不持有 API/service；数据、刷新和发布命令必须由未来已上线的后端 adapter 通过 Props 注入。
- 账号修改／reset 的 service 与 mock 限制由 [Admin domain](../../domains/Admin/BUSINESS.md) 拥有；不要以管理页标题或 mock 成功响应补写默认密码、原子性或正式后端能力。
