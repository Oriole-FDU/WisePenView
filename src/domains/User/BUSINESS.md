# User 业务知识

> Canonical owner：`src/domains/User`

## 范围

本文档维护当前用户资料、认证信息、邀请、任务与新手导览状态。头像上传规则由 [Image](../Image/BUSINESS.md) 维护。

## 用户资料与认证

- `getUserInfo()` 返回侧栏等展示使用的精简字段，并按 service 闭包缓存五分钟；`forceRefresh` 绕过缓存并刷新该缓存。`getFullUserInfo()` 为账号页读取完整资料，不使用这份精简缓存。依据：[UserServices](service/UserServices.impl.ts)、[User](entity/user.ts)。
- 完整资料包含 `readonlyFields`，账号表单据此标记只读字段；账号资料与个人资料是两种更新请求。`updateUserInfo()` 只把实际传入字段映射到 `userInfo` 与 `userProfile`，并依次分别 PUT；两次请求不是原子操作，先成功的部分不会因后一次失败而自动回滚。账号与联系方式由只读展示列表呈现。依据：[数据映射](mapper/UserServices.map.ts)、[账号页](../../views/app/profile/Account/index.tsx)、[UserApi](apis/UserApi.ts)。
- `verificationMode` 表示认证方式，`verificationProviderCode` 表示认证提供方；例如校园身份认证方式可由 `FUDAN_UIS` 提供方标识。二者不可合并成同一认证状态。用户状态另由 `userStatus` 映射。依据：[User entity 与 enum](entity/user.ts)、[认证标签映射](../../views/app/profile/_components/Account/AccountHeader/verificationLabel.ts)、[User mapper](mapper/userEnum.mapper.ts)。

## 邀请、任务与导览

- 个人邀请码从完整用户资料的 `userProfile.inviteCode` 读取；邀请记录由 `/user/invite/listRecords` 分页提供，`BOUND` 与 `REWARDED` 是不同记录状态。奖励数额或后台结算时点不由前端推定。依据：[UserServices](service/UserServices.impl.ts)、[Invite entity](entity/invite.ts)、[User API](apis/UserApi.ts)。
- 任务状态与每日签到结果分别来自任务状态查询与签到 API。状态响应带任务类型、能否完成、一次性／周期性进度和奖励预览；该数据源不等同于前端自行计算的奖励规则。依据：[UserTaskApi](apis/UserTaskApi.ts)、[task mapper](mapper/UserServices.map.ts)、[task entity](entity/userTask.ts)。
- 新手导览的完成状态通过 User service 查询；GuideHost 根据返回状态播放待完成导览，结束时调用完成接口。组件先更新当前页面状态，随后提交完成请求并忽略请求失败；正式完成状态以之后重新读取到的接口结果为准。依据：[UserTourApi](apis/UserTourApi.ts)、[UserServices](service/UserServices.impl.ts)、[GuideHost](../../components/base/Guide/GuideHost/index.tsx)。
