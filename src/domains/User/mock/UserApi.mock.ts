import { mockPage, mockResponse } from '@/domains/_shared/mock/response';

import type {
  CheckFudanUISVerifyApiResponse,
  UserInviteRecordApiResponse,
} from '../apis/AccountApi.schema';
import type { UserApi as UserApiContract } from '../apis/UserApi';
import type { GetUserInfoApiResponse, UserSummaryApi } from '../apis/UserInformationApi.schema';
import mockdata from './mockdata.json';

const fullUserInfo = structuredClone(mockdata) as GetUserInfoApiResponse;
const mockSearchUsers: UserSummaryApi[] = [
  {
    userId: '10086',
    username: 'xiaoming',
    nickname: '小明',
    realName: '王明',
    avatar: '',
    identityType: 1,
  },
  {
    userId: '10087',
    username: 'xiaozhang',
    nickname: '小张',
    realName: '张三',
    avatar: '',
    identityType: 2,
  },
  {
    userId: '10088',
    username: 'agentic.sig',
    nickname: 'SIG 助手',
    realName: '陈思齐',
    avatar: '',
    identityType: 3,
  },
];

/** 邀请记录 mock：脱敏虚拟用户，覆盖已绑定与奖励已发放两种状态 */
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

let mockUisPollCount = 0;

/** 1×1 透明 PNG 的 base64，与线上一致：仅返回图片字符编码、无 data: 前缀 */
const MOCK_UIS_QR_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const checkFudanUISVerify = async (): Promise<CheckFudanUISVerifyApiResponse> => {
  mockUisPollCount += 1;
  if (mockUisPollCount < 3) {
    return {
      completed: false,
      requireAction: false,
      actionPayload: '',
      message: '',
    };
  }
  if (mockUisPollCount === 3) {
    return {
      completed: false,
      requireAction: true,
      actionPayload: MOCK_UIS_QR_PNG_BASE64,
      message: 'Mock：请扫码（未完成，将继续每 2 秒查询）',
    };
  }
  return {
    completed: true,
    requireAction: false,
    actionPayload: '',
    message: 'Mock：认证已完成',
  };
};

export const UserApi: typeof UserApiContract = {
  getUserInfo: () => mockResponse(fullUserInfo),
  searchUser: ({ keyword }) =>
    mockResponse(mockSearchUsers.filter((u) => u.username.toLowerCase() === keyword.toLowerCase())),
  listUserSearchSuggestions: ({ keyword, size = 10 }) =>
    mockResponse(
      mockSearchUsers
        .filter((u) => u.username.toLowerCase().startsWith(keyword.toLowerCase()))
        .slice(0, size)
    ),
  initiateEmailVerify: async () => undefined,
  initiateFudanUISVerify: async () => {
    mockUisPollCount = 0;
  },
  checkFudanUISVerify,
  checkEmailVerify: async () => undefined,
  changeUserInfo: async (params) => {
    Object.assign(fullUserInfo.userInfo, params);
  },
  changeUserProfile: async (params) => {
    Object.assign(fullUserInfo.userProfile, params);
  },
  addFeedback: async () => undefined,
  listInviteRecords: (params) => mockResponse(mockPage(mockInviteRecords, params)),
};
