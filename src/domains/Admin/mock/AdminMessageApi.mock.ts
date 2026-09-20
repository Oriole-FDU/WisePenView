import { mockPage, mockResponse } from '@/domains/_shared/mock/response';

import type { AdminMessageApi as AdminMessageApiContract } from '../apis/AdminMessageApi';

export const AdminMessageApi: typeof AdminMessageApiContract = {
  listAdminMessages: (params) =>
    mockResponse(
      mockPage(
        [
          {
            messageId: 'mock-message-1',
            deliveryScope: 'ALL_USERS',
            messageType: 'SYSTEM',
            title: 'Mock 系统公告',
            content: '这是一条用于 mock 环境展示的站内信。',
            readCount: 3,
            createTime: '2026-03-01T00:00:00Z',
          },
        ],
        params
      )
    ),
  publishMessage: async () => undefined,
};
