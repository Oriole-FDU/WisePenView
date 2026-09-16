import type { User, UserAccountProfile } from '@/domains/User';
import { registerServiceCacheCleaner } from '@/domains/_shared/cacheRegistry';
import { createTtlCache } from '@/domains/_shared/ttlCache';
import { UserApi } from '@domain-apis';
import { UserServicesMap } from '../mapper/UserServices.map';
import type {
  ConfirmEmailVerifyRequest,
  FudanUISVerifyStatusData,
  InitiateUISVerifyRequest,
  IUserService,
  ListAdminMessagesRequest,
  ListAdminMessagesResponse,
  ListUserSearchSuggestionsRequest,
  PublishMessageRequest,
  QueryUserSearchCandidatesRequest,
  SearchUsersRequest,
  SendEmailVerifyRequest,
  SubmitFeedbackRequest,
  UpdateUserInfoRequest,
} from './index.type';

type CachedUserSafe = Pick<
  User,
  'id' | 'username' | 'nickname' | 'avatar' | 'identityType' | 'realName'
>;

const USER_INFO_CACHE_KEY = 'current-user';
const USER_INFO_CACHE_TTL_MS = 5 * 60_000;

/** 全量拉取，为 Account 等页服务，不缓存 */
const getFullUserInfo = async (): Promise<UserAccountProfile> => {
  const data = await UserApi.getUserInfo();
  return UserServicesMap.mapAccountProfileFromApi(data);
};

const searchUsers = async (params: SearchUsersRequest) => {
  const query = UserServicesMap.mapSearchUsersRequest(params);
  if (!query.keyword) return [];
  const data = await UserApi.searchUser(query);
  return UserServicesMap.mapSearchUsersFromApi(data);
};

const listUserSearchSuggestions = async (params: ListUserSearchSuggestionsRequest) => {
  const query = UserServicesMap.mapListUserSearchSuggestionsRequest(params);
  if (query.keyword.length < 2) return [];
  const data = await UserApi.listUserSearchSuggestions(query);
  return UserServicesMap.mapSearchUsersFromApi(data);
};

const queryUserSearchCandidates = async (params: QueryUserSearchCandidatesRequest) => {
  const keyword = params.keyword.trim();
  if (!keyword) return [];
  const size = params.size ?? 10;
  const [exactUsers, suggestionUsers] = await Promise.all([
    searchUsers({ keyword }),
    listUserSearchSuggestions({ keyword, size }),
  ]);
  const userMap = new Map<string, (typeof exactUsers)[number]>();
  [...exactUsers, ...suggestionUsers].forEach((user) => {
    if (!userMap.has(user.userId)) {
      userMap.set(user.userId, user);
    }
  });
  return Array.from(userMap.values()).slice(0, size);
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

const listAdminMessages = async (
  params: ListAdminMessagesRequest
): Promise<ListAdminMessagesResponse> => {
  const query = UserServicesMap.mapListAdminMessagesRequest(params);
  const data = await UserApi.listAdminMessages(query);
  return UserServicesMap.mapListAdminMessagesFromApi(data);
};

const publishMessage = async (params: PublishMessageRequest): Promise<void> => {
  const payload = UserServicesMap.mapPublishMessageRequest(params);
  await UserApi.publishMessage(payload);
};

const submitFeedback = async (params: SubmitFeedbackRequest): Promise<void> => {
  const payload = UserServicesMap.mapSubmitFeedbackRequest(params);
  await UserApi.addFeedback(payload);
};

export const createUserServices = (): IUserService => {
  /** 闭包级缓存，仅存非敏感展示字段，退出登录时清理，读缓存自动过期。 */
  const userInfoCache = createTtlCache<string, CachedUserSafe>(USER_INFO_CACHE_TTL_MS);

  const clearUserCache = (): void => {
    userInfoCache.clear();
  };

  registerServiceCacheCleaner(clearUserCache);

  /** 展示用精简信息，带缓存；无缓存或 forceRefresh 时走 getFullUserInfo 再落缓存 */
  const getUserInfo = async (options?: {
    forceRefresh?: boolean;
    silentUnauthorized?: boolean;
  }): Promise<User> => {
    const forceRefresh = options?.forceRefresh ?? false;
    const cachedUserInfo = userInfoCache.get(USER_INFO_CACHE_KEY);
    if (!forceRefresh && cachedUserInfo) {
      return cachedUserInfo;
    }
    const data = await UserApi.getUserInfo(
      options?.silentUnauthorized ? { skipUnauthorizedHandling: true } : undefined
    );
    const accountProfile = UserServicesMap.mapAccountProfileFromApi(data);
    const userInfo = UserServicesMap.mapUserSafeFromAccountProfile(accountProfile);
    userInfoCache.set(USER_INFO_CACHE_KEY, userInfo);
    return userInfo;
  };

  /** 更新用户信息：按实际传入字段分别 PUT，避免「只改头像」时带空 body 误伤资料表 */
  const updateUserInfo = async (params: UpdateUserInfoRequest): Promise<void> => {
    const { userInfoPayload, userProfilePayload } =
      UserServicesMap.mapUpdateUserInfoRequests(params);
    const hasUserInfoPayload = Object.keys(userInfoPayload).length > 0;
    const hasUserProfilePayload = Object.keys(userProfilePayload).length > 0;
    if (!hasUserInfoPayload && !hasUserProfilePayload) {
      return;
    }
    if (hasUserInfoPayload) {
      await UserApi.changeUserInfo(userInfoPayload);
    }
    if (hasUserProfilePayload) {
      await UserApi.changeUserProfile(userProfilePayload);
    }

    userInfoCache.delete(USER_INFO_CACHE_KEY);
  };

  return {
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
};
