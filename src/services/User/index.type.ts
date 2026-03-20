import type { User } from '@/types/user';

/** UserService 接口：供依赖注入使用 */
export interface IUserService {
  /** 全量拉取用户信息（为 Account 等页服务），不缓存 */
  getFullUserInfo(): Promise<GetUserInfoResponse>;
  /** 展示用精简用户信息，带缓存，供侧栏等展示 */
  getUserInfo(options?: { forceRefresh?: boolean }): Promise<User>;
  /** 更新用户信息（内部两次 PUT：userInfo + userProfile）；不拉 GET，需全量时由调用方自行 getFullUserInfo */
  updateUserInfo(params: UpdateUserInfoRequest): Promise<void>;
  sendEmailVerify(params: SendEmailVerifyRequest): Promise<void>;
  /** 发起复旦 UIS 认证（与 OpenAPI initiateFudanUISVerify 对齐） */
  initiateUISVerify(params: InitiateUISVerifyRequest): Promise<void>;
  /** 查询复旦 UIS 认证状态（单次，与 checkFudanUISVerify 对齐） */
  checkFudanUISVerify(): Promise<FudanUISVerifyStatusData>;
  /**
   * 每 intervalMs 轮询 checkFudanUISVerify，直到 data.completed 为 true。
   * 未完成前每次响应可通过 onProgress 更新 UI（如先展示二维码，再持续轮询直至完成）。
   */
  pollFudanUISVerifyUntilComplete(
    options?: PollFudanUISVerifyOptions
  ): Promise<FudanUISVerifyStatusData>;
  confirmEmailVerify(params: ConfirmEmailVerifyRequest): Promise<void>;
  /** 退出登录时清理缓存 */
  clearUserCache(): void;
}

/** 确认邮箱验证请求参数 */
export interface ConfirmEmailVerifyRequest {
  token: string;
}

/** 发起邮箱验证请求参数（后端接受完整邮箱字符串） */
export interface SendEmailVerifyRequest {
  email: string;
}

/** 发起复旦 UIS 认证请求参数（OpenAPI：query uisAccount、uisPassword） */
export interface InitiateUISVerifyRequest {
  uisAccount: string;
  uisPassword: string;
}

/** checkFudanUISVerify 响应 data */
export interface FudanUISVerifyStatusData {
  /** 认证流程是否已结束 */
  completed: boolean;
  requireAction: boolean;
  /** 需用户操作时：二维码图片的 base64 字符（PNG/JPEG）；可选带 data:image/*;base64, 前缀 */
  actionPayload: string;
  message: string;
}

/** pollFudanUISVerifyUntilComplete 选项 */
export interface PollFudanUISVerifyOptions {
  /** 轮询间隔，默认 2000ms */
  intervalMs?: number;
  /** 取消轮询（如关闭弹窗、离开页面） */
  signal?: AbortSignal;
  /** 每次 check 返回后调用（含 completed 仍为 false 的中间态） */
  onProgress?: (status: FudanUISVerifyStatusData) => void;
}

/** 更新用户信息请求参数（仅基本档案可编辑；账号栏只读；impl 内按 userInfo / userProfile 拆成两次 PUT） */
export interface UpdateUserInfoRequest {
  nickname?: string;
  realName?: string;
  /** 头像 URL（图床上传后的公开地址，与后端 UserInfoUpdateRequest.avatar 对齐） */
  avatar?: string;
  sex?: number;
  university?: string | null;
  college?: string;
  major?: string;
  className?: string;
  enrollmentYear?: string;
  degreeLevel?: number;
  academicTitle?: string;
}

/** 获取用户信息接口响应 data 中的 userInfo；id 用 string 避免大数精度丢失 */
export interface GetUserInfoResponseUserInfo {
  id?: string;
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
