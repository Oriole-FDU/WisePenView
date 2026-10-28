# 通知收件匣工作流程业务知识

## 范围

通知页面拥有已加载通知的呈现、选取、跳转、分页与已读互动。消息资料和 `readTime` 映射由 [Message domain](../../../domains/Message/BUSINESS.md) 拥有；Chat 消息历史不属于通知收件匣。

## 规则

- 通知清单每页请求 100 笔，采用 infinite scroll，并以虚拟清单呈现已加载项目；URL 的 `messageId` 用来选取已加载的通知。依据：[NotificationsPage](index.tsx) 的 `MESSAGE_PAGE_SIZE`、`useApiInfiniteScroll`、`selectedMessageId`、`useVirtualizer`。
- 点选未读通知时先导航至该通知路径，再调用 read API；API 成功后才把本地已加载项目标为已读。读取失败会提示错误，不先乐观地更新已读状态。依据：[NotificationsPage](index.tsx) 的 `handleSelectMessage`、`markLoadedMessageAsRead`。
- 「全部已读」只提交按下时已加载清单中的未读 message ID；成功后将当下本地清单全部标为已读，没有依原提交 ID 逐笔比对。若请求期间加载更多通知，本地更新也可能涵盖未提交的项目，不能视为后端已读结果；前端没有对未加载页面发出全局已读请求。依据：[NotificationsPage](index.tsx) 的 `handleMarkAllAsRead`、`markLoadedMessagesAsRead`。
- 通知的 `jumpUrl` 若是 HTTP(S) URL 会在新分页开启并使用 `noopener,noreferrer`；否则由应用路由导航。依据：[NotificationsPage](index.tsx) 的 `handleOpenJumpUrl`。
