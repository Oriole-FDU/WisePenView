import { mockPage, mockResponse } from '@/domains/_shared/mock/response';

import type { UserInviteApi as UserInviteApiContract } from '../apis/UserInviteApi';
import type { UserInviteRecordApiResponse } from '../apis/UserInviteApi.schema';

const mockInviteRecords: UserInviteRecordApiResponse[] = [
  {
    id: '90001',
    inviteeUserId: '20001',
    inviteeDisplay: {
      nickname: '同学甲',
      username: 'mock_invitee_a',
      avatar: null,
      identityType: 1,
      realName: null,
      campusNo: null,
      email: null,
      mobile: null,
    },
    status: 'REWARDED',
    createTime: Date.parse('2026-03-02T10:12:00Z'),
    rewardTime: Date.parse('2026-03-05T09:30:00Z'),
  },
  {
    id: '90002',
    inviteeUserId: '20002',
    inviteeDisplay: {
      nickname: '同学乙',
      username: 'mock_invitee_b',
      avatar: null,
      identityType: 1,
      realName: null,
      campusNo: null,
      email: null,
      mobile: null,
    },
    status: 'BOUND',
    createTime: Date.parse('2026-03-08T14:05:00Z'),
    rewardTime: null,
  },
];

export const UserInviteApi: typeof UserInviteApiContract = {
  listInviteRecords: (params) => mockResponse(mockPage(mockInviteRecords, params)),
};
