# UserTour 领域业务知识

> Canonical owner：`src/domains/UserTour`

## 范围

本文件拥有新手导览完成状态与完成命令的数据语义。导览编排、页面定位和播放流程由 [GuideHost](../../components/base/Guide/GuideHost/index.tsx) 拥有。

## 状态规则

- 导览状态按 `TourCode` 返回完成标记；前端只消费后端状态，不在领域层推导某项功能是否已教过。
- GuideHost 结束时可以先更新内存状态再提交完成命令，并允许命令失败；正式完成状态以后续重新查询结果为准。依据：[UserTourServices](service/UserTourServices.impl.ts)、[GuideHost](../../components/base/Guide/GuideHost/index.tsx)。
