import { mockPage, mockResponse } from '@/domains/_shared/mock/response';
import type { UserApi as UserApiContract } from '../apis/UserApi';
import type { GetUserInfoApiResponse, UserSearchUserApiResponse } from '../apis/UserApi.type';
import mockdata from './mockdata.json';
export { UserWalletApi } from './UserWalletApi.mock';

const fullUserInfo = structuredClone(mockdata) as GetUserInfoApiResponse;
const mockSearchUsers: UserSearchUserApiResponse[] = [
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

let mockUisPollCount = 0;

/** 1×1 透明 PNG 的 base64，与线上一致：仅返回图片字符编码、无 data: 前缀 */
const MOCK_UIS_QR_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const checkFudanUISVerify = async (): Promise<unknown> => {
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
  addFeedback: async () => undefined,
};
