import { mockPage, mockResponse } from '@/domains/_shared/mock/response';
import type { MessageApi as MessageApiContract } from '../apis/MessageApi';
import type { UserMessageApiModel } from '../apis/MessageApi.type';

const now = Date.now();

const mockMessages: UserMessageApiModel[] = [
  {
    messageId: 'mock-message-1',
    deliveryScope: 'ALL_USERS',
    messageType: 'SYSTEM',
    title: 'WisePen 系统维护与功能更新公告',
    content: `各位老师、同学好：

WisePen 将在 **今晚 23:30 - 23:50** 进行一次短暂维护。维护期间平台主体功能可正常访问，但部分 AI 对话、云盘和课程相关能力可能出现短暂延迟。

## 维护影响

- 云盘文件上传、移动、删除可能会延迟同步。
- AI 对话仍可打开，个别长任务可能需要稍后刷新查看结果。
- 课程资料与公告列表可能短暂显示旧数据。

## 本次更新

1. 优化了资源侧栏的加载体验。
2. 修复了部分通知已读状态不同步的问题。
3. 为后续课程公告与系统通知统一入口做准备。

> 如果你正在编辑重要文档，建议在维护开始前确认内容已保存。

维护结束后无需重新登录。若遇到异常，可先刷新页面，或通过用户反馈联系我们。`,
    jumpUrl: '/drive/personal',
    readTime: null,
    createTime: now,
  },
  {
    messageId: 'mock-message-2',
    deliveryScope: 'DIRECT',
    messageType: 'NORMAL',
    title: '课程资料已更新',
    content: `你参与的课程新增了一份阅读材料：

- 阅读材料：**课程阅读清单**
- 建议完成时间：本周五前
- 关联任务：课堂讨论准备

请进入课程页面查看详情，并根据材料中的检查项更新自己的学习笔记。`,
    readTime: new Date(now).toISOString(),
    createTime: now - 86_400_000,
  },
];

export const MessageApi: typeof MessageApiContract = {
  listUserMessages: (params) => mockResponse(mockPage(mockMessages, params)),
  readMessage: async ({ messageIds }) => {
    for (const message of mockMessages)
      if (messageIds.includes(String(message.messageId)))
        message.readTime = new Date().toISOString();
  },
};
