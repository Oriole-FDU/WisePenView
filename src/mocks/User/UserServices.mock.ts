import type { User } from '@/types/user';
import type { FudanUISVerifyStatusData, IUserService } from '@/services/User';
import type { GetUserInfoResponse } from '@/services/User';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fullUserInfo = mockdata as GetUserInfoResponse;

const getUserInfo = async (_options?: { forceRefresh?: boolean }): Promise<User> => {
  await delay(200);
  const { userInfo } = fullUserInfo;
  return {
    id: userInfo.id ?? '',
    username: userInfo.username,
    nickname: userInfo.nickname ?? undefined,
    avatar: userInfo.avatar ?? undefined,
    identityType: userInfo.identityType,
  };
};

const getFullUserInfo = async (): Promise<GetUserInfoResponse> => {
  await delay(200);
  return fullUserInfo;
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
  updateUserInfo,
  sendEmailVerify,
  initiateUISVerify,
  checkFudanUISVerify,
  confirmEmailVerify,
  clearUserCache,
};
