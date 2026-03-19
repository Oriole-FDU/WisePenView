import type { User } from '@/types/user';

/** UserService 接口：供依赖注入使用 */
export interface IUserService {
  /** 获取用户信息（带缓存，信息为空或 forceRefresh 时重新拉取） */
  getUserInfo(options?: { forceRefresh?: boolean }): Promise<User>;
  /** 全量拉取用户信息（含敏感字段），不缓存，需展示 realName/campusNo 等时调用 */
  getFullUserInfo(): Promise<GetUserInfoResponse>;
  sendEmailVerify(params: SendEmailVerifyRequest): Promise<void>;
  confirmEmailVerify(params: ConfirmEmailVerifyRequest): Promise<void>;
  updateUserProfile(params: UpdateUserProfileRequest): Promise<GetUserInfoResponse>;
  /** 退出登录时清理缓存 */
  clearUserCache(): void;
}

/** 确认邮箱验证请求参数 */
export interface ConfirmEmailVerifyRequest {
  token: string;
}

/** 发起邮箱验证请求参数 */
export interface SendEmailVerifyRequest {
  /** 0 -> @m.fudan.edu.cn；1 -> @fudan.edu.cn */
  suffixType: number;
}

/** 更新用户档案请求参数（账号可编辑：学工号、手机号；基本档案可编辑字段；邮箱只读） */
export interface UpdateUserProfileRequest {
  campusNo?: string;
  mobile?: string;
  nickname?: string;
  realName?: string;
  sex?: number;
  university?: string | null;
  college?: string;
  major?: string;
  className?: string;
  enrollmentYear?: string;
  degreeLevel?: number;
  academicTitle?: string;
}

/** 获取用户信息接口响应 data 中的 userInfo */
export interface GetUserInfoResponseUserInfo {
  id?: number;
  nickname: string | null;
  realName: string | null;
  avatar: string | null;
  identityType: number;
  username: string;
  campusNo: string;
  email: string | null;
  mobile: string | null;
  verificationMode: number | string | null;
  status: number;
}

/** 获取用户信息接口响应 data 中的 userProfile */
export interface GetUserInfoResponseUserProfile {
  sex: number;
  university: string | null;
  college: string | null;
  major: string | null;
  className: string | null;
  enrollmentYear: string | null;
  degreeLevel: number | null;
  academicTitle: string | null;
}

/** 获取用户信息接口的响应 data 类型 */
export interface GetUserInfoResponse {
  userInfo: GetUserInfoResponseUserInfo;
  userProfile: GetUserInfoResponseUserProfile;
  readonlyFields: string[] | null;
}
