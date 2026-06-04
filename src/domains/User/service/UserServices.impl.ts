import type { User } from '@/domains/User';
import { registerServiceCacheCleaner } from '@/domains/_shared/cacheRegistry';
import { UserApi } from '../apis/UserApi';
import { UserServicesMap } from '../mapper/UserServices.map';
import type {
  ConfirmEmailVerifyRequest,
  FudanUISVerifyStatusData,
  GetUserInfoResponse,
  InitiateUISVerifyRequest,
  IUserService,
  SendEmailVerifyRequest,
  UpdateUserInfoRequest,
} from './index.type';

type CachedUserSafe = Pick<User, 'id' | 'username' | 'nickname' | 'avatar' | 'identityType'>;

/** 全量拉取，为 Account 等页服务，不缓存 */
const getFullUserInfo = async (): Promise<GetUserInfoResponse> => {
  return UserApi.getUserInfo() as Promise<GetUserInfoResponse>;
};

const sendEmailVerify = async (params: SendEmailVerifyRequest): Promise<void> => {
  const query = UserServicesMap.mapSendEmailVerifyRequest(params);
  await UserApi.initiateEmailVerify(query);
};

const initiateUISVerify = async (params: InitiateUISVerifyRequest): Promise<void> => {
  const query = UserServicesMap.mapInitiateUISVerifyRequest(params);
  await UserApi.initiateFudanUISVerify(query);
};

const checkFudanUISVerify = async (): Promise<FudanUISVerifyStatusData> => {
  const data = await UserApi.checkFudanUISVerify();
  return UserServicesMap.mapFudanUISVerifyStatusFromApi(data);
};

const confirmEmailVerify = async (params: ConfirmEmailVerifyRequest): Promise<void> => {
  const query = UserServicesMap.mapConfirmEmailVerifyRequest(params);
  await UserApi.checkEmailVerify(query);
};

export const createUserServices = (): IUserService => {
  /** 闭包级缓存，仅存非敏感展示字段，退出登录时通过 clearUserCache 清理 */
  let cachedUserInfo: CachedUserSafe | null = null;

  const clearUserCache = (): void => {
    cachedUserInfo = null;
  };

  registerServiceCacheCleaner(clearUserCache);

  /** 展示用精简信息，带缓存；无缓存或 forceRefresh 时走 getFullUserInfo 再落缓存 */
  const getUserInfo = async (options?: { forceRefresh?: boolean }): Promise<User> => {
    const forceRefresh = options?.forceRefresh ?? false;
    if (!forceRefresh && cachedUserInfo) {
      return cachedUserInfo;
    }
    const data = await getFullUserInfo();
    cachedUserInfo = UserServicesMap.mapUserSafeFromApi(data);
    return cachedUserInfo;
  };

  /** 更新用户信息：按实际传入字段分别 PUT，避免「只改头像」时带空 body 误伤资料表 */
  const updateUserInfo = async (params: UpdateUserInfoRequest): Promise<void> => {
    const { userInfoPayload, userProfilePayload } =
      UserServicesMap.mapUpdateUserInfoRequests(params);
    const tasks: Promise<unknown>[] = [];
    if (Object.keys(userInfoPayload).length > 0) {
      tasks.push(UserApi.changeUserInfo(userInfoPayload));
    }
    if (Object.keys(userProfilePayload).length > 0) {
      tasks.push(UserApi.changeUserProfile(userProfilePayload));
    }
    if (tasks.length === 0) {
      return;
    }
    await Promise.all(tasks);

    cachedUserInfo = null;
  };

  return {
    getFullUserInfo,
    getUserInfo,
    updateUserInfo,
    sendEmailVerify,
    initiateUISVerify,
    checkFudanUISVerify,
    confirmEmailVerify,
    clearUserCache,
  };
};
