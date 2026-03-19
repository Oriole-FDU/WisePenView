import type { User } from '@/types/user';
import type { IUserService } from '@/services/User';
import type { GetUserInfoResponse } from '@/services/User';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fullUserInfo = mockdata as GetUserInfoResponse;

const getUserInfo = async (_options?: { forceRefresh?: boolean }): Promise<User> => {
  await delay(200);
  const { userInfo } = fullUserInfo;
  return {
    id: userInfo.id ?? 0,
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

const confirmEmailVerify = async (): Promise<void> => {
  await delay(200);
};

const updateUserProfile = async (
  params: Parameters<IUserService['updateUserProfile']>[0]
): Promise<GetUserInfoResponse> => {
  await delay(200);
  const { nickname, realName, campusNo, mobile, ...profileParams } = params;
  return {
    userInfo: {
      ...fullUserInfo.userInfo,
      ...(nickname !== undefined && { nickname }),
      ...(realName !== undefined && { realName }),
      ...(campusNo !== undefined && { campusNo }),
      ...(mobile !== undefined && { mobile }),
    },
    userProfile: { ...fullUserInfo.userProfile, ...profileParams },
    readonlyFields: fullUserInfo.readonlyFields,
  };
};

const clearUserCache = (): void => {};

export const UserServicesMock: IUserService = {
  getUserInfo,
  getFullUserInfo,
  sendEmailVerify,
  confirmEmailVerify,
  updateUserProfile,
  clearUserCache,
};
