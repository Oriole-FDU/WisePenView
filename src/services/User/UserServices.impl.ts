import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import { toIdString } from '@/utils/number';
import type { ApiResponse } from '@/types/api';
import type { User } from '@/types/user';
import type {
  ConfirmEmailVerifyRequest,
  FudanUISVerifyStatusData,
  GetUserInfoResponse,
  InitiateUISVerifyRequest,
  PollFudanUISVerifyOptions,
  SendEmailVerifyRequest,
  UpdateUserInfoRequest,
} from './index.type';
import type { IUserService } from './index.type';

/** 仅缓存展示用字段和 id，不含 realName、campusNo 等敏感信息；id 归一化为 string 避免大数精度丢失 */
type CachedUserSafe = Pick<User, 'id' | 'username' | 'nickname' | 'avatar' | 'identityType'>;

const toUserSafe = (data: GetUserInfoResponse): CachedUserSafe => {
  const { userInfo } = data;
  return {
    id: toIdString(userInfo.id),
    username: userInfo.username,
    nickname: userInfo.nickname ?? undefined,
    avatar: userInfo.avatar ?? undefined,
    identityType: userInfo.identityType,
  };
};

/** 模块级缓存，仅存非敏感展示字段，退出登录时通过 clearUserCache 清理 */
let cachedUserInfo: CachedUserSafe | null = null;

/** 全量拉取，为 Account 等页服务，不缓存 */
const getFullUserInfo = async (): Promise<GetUserInfoResponse> => {
  const res = (await Axios.get('/user/getUserInfo')) as ApiResponse<GetUserInfoResponse>;
  checkResponse(res);
  return res.data;
};

/** 展示用精简信息，带缓存；无缓存或 forceRefresh 时走 getFullUserInfo 再落缓存 */
const getUserInfo = async (options?: { forceRefresh?: boolean }): Promise<User> => {
  const forceRefresh = options?.forceRefresh ?? false;
  if (!forceRefresh && cachedUserInfo) {
    return cachedUserInfo;
  }
  const data = await getFullUserInfo();
  cachedUserInfo = toUserSafe(data);
  return cachedUserInfo;
};

/** 更新用户信息：按实际传入字段分别 PUT，避免「只改头像」时带空 body 误伤资料表 */
const updateUserInfo = async (params: UpdateUserInfoRequest): Promise<void> => {
  const userInfoPayload: Record<string, string | undefined> = {};
  if (params.nickname !== undefined) userInfoPayload.nickname = params.nickname;
  if (params.realName !== undefined) userInfoPayload.realName = params.realName;
  if (params.avatar !== undefined) userInfoPayload.avatar = params.avatar;

  const userProfilePayload: Record<string, string | number | null | undefined> = {};
  if (params.sex !== undefined) userProfilePayload.sex = params.sex;
  if (params.university !== undefined) userProfilePayload.university = params.university;
  if (params.college !== undefined) userProfilePayload.college = params.college;
  if (params.major !== undefined) userProfilePayload.major = params.major;
  if (params.className !== undefined) userProfilePayload.className = params.className;
  if (params.enrollmentYear !== undefined)
    userProfilePayload.enrollmentYear = params.enrollmentYear;
  if (params.degreeLevel !== undefined) userProfilePayload.degreeLevel = params.degreeLevel;
  if (params.academicTitle !== undefined) userProfilePayload.academicTitle = params.academicTitle;

  const tasks: Promise<ApiResponse<unknown>>[] = [];
  if (Object.keys(userInfoPayload).length > 0) {
    tasks.push(Axios.put('/user/changeUserInfo', userInfoPayload) as Promise<ApiResponse<unknown>>);
  }
  if (Object.keys(userProfilePayload).length > 0) {
    tasks.push(
      Axios.put('/user/changeUserProfile', userProfilePayload) as Promise<ApiResponse<unknown>>
    );
  }
  if (tasks.length === 0) {
    return;
  }
  const results = await Promise.all(tasks);
  results.forEach((res) => {
    checkResponse(res);
  });

  cachedUserInfo = null;
};

const clearUserCache = (): void => {
  cachedUserInfo = null;
};

const sendEmailVerify = async (params: SendEmailVerifyRequest): Promise<void> => {
  const res = (await Axios.post('/user/verify/initiateEmailVerify', null, {
    params: { email: params.email },
  })) as ApiResponse;
  checkResponse(res);
};

const initiateUISVerify = async (params: InitiateUISVerifyRequest): Promise<void> => {
  const res = (await Axios.post('/user/verify/initiateFudanUISVerify', null, {
    params: {
      uisAccount: params.uisAccount,
      uisPassword: params.uisPassword,
    },
  })) as ApiResponse;
  checkResponse(res);
};

const normalizeFudanUISVerifyData = (raw: unknown): FudanUISVerifyStatusData => {
  if (!raw || typeof raw !== 'object') {
    return {
      completed: false,
      requireAction: false,
      actionPayload: '',
      message: '',
    };
  }
  const d = raw as Record<string, unknown>;
  return {
    completed: Boolean(d.completed),
    requireAction: Boolean(d.requireAction),
    actionPayload: typeof d.actionPayload === 'string' ? d.actionPayload : '',
    message: typeof d.message === 'string' ? d.message : '',
  };
};

const checkFudanUISVerify = async (): Promise<FudanUISVerifyStatusData> => {
  const res = (await Axios.get('/user/verify/checkFudanUISVerify')) as ApiResponse<unknown>;
  checkResponse(res);
  return normalizeFudanUISVerifyData(res.data);
};

const throwIfAborted = (signal: AbortSignal | undefined): void => {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
};

const sleep = (ms: number, signal: AbortSignal | undefined): Promise<void> =>
  new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });

const pollFudanUISVerifyUntilComplete = async (
  options?: PollFudanUISVerifyOptions
): Promise<FudanUISVerifyStatusData> => {
  const intervalMs = options?.intervalMs ?? 2000;
  const { signal, onProgress } = options ?? {};

  for (;;) {
    throwIfAborted(signal);
    const status = await checkFudanUISVerify();
    onProgress?.(status);
    if (status.completed) {
      return status;
    }
    await sleep(intervalMs, signal);
  }
};

const confirmEmailVerify = async (params: ConfirmEmailVerifyRequest): Promise<void> => {
  const res = (await Axios.get('/user/verify/checkEmailVerify', {
    params: { token: params.token },
  })) as ApiResponse;
  checkResponse(res);
};

export const UserServicesImpl: IUserService = {
  getFullUserInfo,
  getUserInfo,
  updateUserInfo,
  sendEmailVerify,
  initiateUISVerify,
  checkFudanUISVerify,
  pollFudanUISVerifyUntilComplete,
  confirmEmailVerify,
  clearUserCache,
};
