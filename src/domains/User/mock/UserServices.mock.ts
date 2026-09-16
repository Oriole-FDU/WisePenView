import type {
  FudanUISVerifyStatusData,
  IUserService,
  ListAdminMessagesResponse,
  PublishMessageRequest,
  SubmitFeedbackRequest,
  User,
  UserAccountProfile,
  UserSearchUser,
} from '@/domains/User';

import type { GetUserInfoApiResponse } from '../apis/UserApi.type';
import { normalizeIdentityTypeFromApi } from '../mapper/userEnum.mapper';
import { UserServicesMap } from '../mapper/UserServices.map';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fullUserInfo = mockdata as GetUserInfoApiResponse;
const mockSearchUsers: UserSearchUser[] = [
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

const getUserInfo = async (_options?: { forceRefresh?: boolean }): Promise<User> => {
  await delay(200);
  const { userInfo } = fullUserInfo;
  return {
    id: fullUserInfo.userId?.toString() ?? '',
    username: userInfo.username,
    nickname: userInfo.nickname ?? undefined,
    realName: userInfo.realName ?? undefined,
    avatar: userInfo.avatar ?? undefined,
    identityType: normalizeIdentityTypeFromApi(userInfo.identityType),
  };
};

const getFullUserInfo = async (): Promise<UserAccountProfile> => {
  await delay(200);
  return UserServicesMap.mapAccountProfileFromApi(fullUserInfo);
};

const searchUsers = async (params: Parameters<IUserService['searchUsers']>[0]) => {
  await delay(160);
  const keyword = params.keyword.trim().toLowerCase();
  if (!keyword) return [];
  return mockSearchUsers.filter((user) => user.username.toLowerCase() === keyword);
};

const listUserSearchSuggestions = async (
  params: Parameters<IUserService['listUserSearchSuggestions']>[0]
) => {
  await delay(160);
  const keyword = params.keyword.trim().toLowerCase();
  if (keyword.length < 2) return [];
  const size = params.size ?? 10;
  return mockSearchUsers
    .filter((user) => user.username.toLowerCase().startsWith(keyword))
    .slice(0, size);
};

const queryUserSearchCandidates = async (
  params: Parameters<IUserService['queryUserSearchCandidates']>[0]
) => {
  const keyword = params.keyword.trim();
  if (!keyword) return [];
  const size = params.size ?? 10;
  const [exactUsers, suggestionUsers] = await Promise.all([
    searchUsers({ keyword }),
    listUserSearchSuggestions({ keyword, size }),
  ]);
  const userMap = new Map<string, UserSearchUser>();
  [...exactUsers, ...suggestionUsers].forEach((user) => {
    if (!userMap.has(user.userId)) {
      userMap.set(user.userId, user);
    }
  });
  return Array.from(userMap.values()).slice(0, size);
};

const sendEmailVerify = async (): Promise<void> => {
  await delay(200);
};

const initiateUISVerify = async (): Promise<void> => {
  await delay(200);
  mockUisPollCount = 0;
};

/**
 * 模拟：前两次未完成 → 第三次返回二维码但 completed 仍为 false（需继续轮询）
 * → 第四次 completed 为 true 结束
 */
let mockUisPollCount = 0;

/** 1×1 透明 PNG 的 base64，与线上一致：仅返回图片字符编码、无 data: 前缀 */
const MOCK_UIS_QR_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const checkFudanUISVerify = async (): Promise<FudanUISVerifyStatusData> => {
  await delay(100);
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

const confirmEmailVerify = async (): Promise<void> => {
  await delay(200);
};

const listAdminMessages = async (): Promise<ListAdminMessagesResponse> => {
  await delay(200);
  return {
    messages: [
      {
        messageId: 'mock-message-1',
        deliveryScope: 'ALL_USERS',
        messageType: 'SYSTEM',
        title: 'Mock 系统公告',
        content: '这是一条用于 mock 环境展示的站内信。',
        jumpUrl: '',
        readCount: 3,
        createTime: new Date().toISOString(),
      },
    ],
    total: 1,
    page: 1,
    size: 20,
    totalPage: 1,
  };
};

const publishMessage = async (_params: PublishMessageRequest): Promise<void> => {
  await delay(200);
};

const submitFeedback = async (_params: SubmitFeedbackRequest): Promise<void> => {
  await delay(200);
};

const updateUserInfo = async (
  params: Parameters<IUserService['updateUserInfo']>[0]
): Promise<void> => {
  await delay(200);
  const {
    nickname,
    realName,
    avatar,
    sex,
    university,
    college,
    major,
    className,
    enrollmentYear,
    degreeLevel,
    academicTitle,
  } = params;
  Object.assign(fullUserInfo.userInfo, {
    ...(nickname !== undefined && { nickname }),
    ...(realName !== undefined && { realName }),
    ...(avatar !== undefined && { avatar }),
  });
  Object.assign(fullUserInfo.userProfile, {
    ...(sex !== undefined && { sex }),
    ...(university !== undefined && { university }),
    ...(college !== undefined && { college }),
    ...(major !== undefined && { major }),
    ...(className !== undefined && { className }),
    ...(enrollmentYear !== undefined && { enrollmentYear }),
    ...(degreeLevel !== undefined && { degreeLevel }),
    ...(academicTitle !== undefined && { academicTitle }),
  });
};

const clearUserCache = (): void => {};

export const UserServicesMock: IUserService = {
  getFullUserInfo,
  getUserInfo,
  searchUsers,
  listUserSearchSuggestions,
  queryUserSearchCandidates,
  updateUserInfo,
  sendEmailVerify,
  initiateUISVerify,
  checkFudanUISVerify,
  confirmEmailVerify,
  listAdminMessages,
  publishMessage,
  submitFeedback,
  clearUserCache,
};
