# Feedback 领域业务知识

> Canonical owner：`src/domains/Feedback`

## 范围

本文件拥有用户反馈提交的数据边界；反馈表单和成功提示由 [UserFeedbackModal](../../components/business/Sidebar/_common/footer/UserFeedbackModal/index.tsx) 拥有。

## 提交规则

- 反馈类型是固定枚举；mapper 才注入浏览器 User-Agent，图片 URL 只接受 trim 后的非空值。浏览器信息是辅助诊断字段，不代表后端采集范围或持久化承诺。依据：[FeedbackServicesMap](mapper/FeedbackServices.map.ts)、[FeedbackApi](apis/FeedbackApi.contract.ts)。
