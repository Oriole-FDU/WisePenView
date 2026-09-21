import type { UserInviteRecordList } from '../entity/invite';
import type { User, UserAccountProfile, UserSearchUser } from '../entity/user';
import type { UserTaskCheckInResult, UserTaskStatus } from '../entity/userTask';
import type { DegreeLevel, FeedbackType } from '../enum';

/** UserService 接口：供依赖注入使用 */
export interface IUserService {
  /** 全量拉取用户信息（为 Account 等页服务），不缓存 */
  getFullUserInfo(): Promise<UserAccountProfile>;
  /** 展示用精简用户信息，带缓存，供侧栏等展示 */
  getUserInfo(options?: { forceRefresh?: boolean; silentUnauthorized?: boolean }): Promise<User>;
  /** 精确搜索可见用户：完整用户名或邮箱 */
  searchUsers(params: SearchUsersRequest): Promise<UserSearchUser[]>;
  /** 当前用户小组范围内的用户搜索补全 */
  listUserSearchSuggestions(params: ListUserSearchSuggestionsRequest): Promise<UserSearchUser[]>;
  /** 当前用户发出的邀请记录（按邀请时间倒序分页） */
  listInviteRecords(params: ListUserInviteRecordsRequest): Promise<UserInviteRecordList>;
  /** 用户选择框候选查询：合并精确搜索与补全结果 */
  queryUserSearchCandidates(params: QueryUserSearchCandidatesRequest): Promise<UserSearchUser[]>;
  /** 更新用户信息（内部两次 PUT：userInfo + userProfile）；不拉 GET，需全量时由调用方自行 getFullUserInfo */
  updateUserInfo(params: UpdateUserInfoRequest): Promise<void>;
  sendEmailVerify(params: SendEmailVerifyRequest): Promise<void>;
  /** 发起复旦 UIS 认证（与 OpenAPI initiateFudanUISVerify 对齐） */
  initiateUISVerify(params: InitiateUISVerifyRequest): Promise<void>;
  /** 查询复旦 UIS 认证状态（单次，与 checkFudanUISVerify 对齐） */
  checkFudanUISVerify(): Promise<FudanUISVerifyStatusData>;
  confirmEmailVerify(params: ConfirmEmailVerifyRequest): Promise<void>;
  submitFeedback(params: SubmitFeedbackRequest): Promise<void>;
  listTaskStatus(): Promise<UserTaskStatus[]>;
  dailyCheckIn(): Promise<UserTaskCheckInResult>;
}

/** 确认邮箱验证请求参数 */
export interface ConfirmEmailVerifyRequest {
  token: string;
}

/** 发起邮箱验证请求参数（后端接受完整邮箱字符串） */
export interface SendEmailVerifyRequest {
  email: string;
}

export interface SearchUsersRequest {
  keyword: string;
}

export interface ListUserSearchSuggestionsRequest {
  keyword: string;
  size?: number;
}

export interface QueryUserSearchCandidatesRequest {
  keyword: string;
  size?: number;
}

export interface ListUserInviteRecordsRequest {
  page: number;
  size: number;
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

export interface SubmitFeedbackRequest {
  types: FeedbackType[];
  content: string;
  contact: string;
  imageUrl?: string;
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
  degreeLevel?: DegreeLevel;
  academicTitle?: string;
}
