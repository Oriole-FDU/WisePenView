# UserTask 领域业务知识

> Canonical owner：`src/domains/UserTask`

## 范围

本文件拥有用户任务状态与每日签到结果的数据语义。签到入口和奖励滚动展示由 [侧栏 UserCheckIn](../../components/business/Sidebar/_common/footer/UserCheckIn/index.tsx) 拥有。

## 任务与签到

- 任务状态来自 `/user/task/listTaskStatus`，包含任务类型、能否完成、一次性／周期性进度和奖励预览；前端不自行推导奖励规则。依据：[UserTaskApi](apis/UserTaskApi.ts)、[UserTaskServicesMap](mapper/UserTaskServices.map.ts)。
- 每日签到返回实际奖励、保底命中、周期进度与今日状态。签到成功后由调用端刷新自身状态，不把请求成功扩展解释为所有任务均已更新。依据：[DailyCheckInApiContract](apis/UserTaskApi.contract.ts)。
