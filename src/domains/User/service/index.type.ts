import type { UserInviteRecordList } from '../entity/invite';
import type { User, UserAccountProfile, UserSearchUser } from '../entity/user';
import type { DegreeLevel, FeedbackType, Sex } from '../enum';

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
  listInviteRecords(params: ListUserInviteRecordsRequest): Promise<UserInviteRecordList>;
  /** 用户选择框候选查询：合并精确搜索与补全结果 */
  queryUserSearchCandidates(params: QueryUserSearchCandidatesRequest): Promise<UserSearchUser[]>;
  /** 更新用户信息（内部两次 PUT：userInfo + userProfile）；不拉 GET，需全量时由调用方自行 getFullUserInfo */
  updateUserInfo(params: UpdateUserInfoRequest): Promise<void>;
  submitFeedback(params: SubmitFeedbackRequest): Promise<void>;
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

export interface SubmitFeedbackRequest {
  type: FeedbackType;
  content: string;
  contact: string;
  imageUrl?: string;
}

/** 更新用户信息请求参数（仅基本资料可编辑；账号栏只读；impl 内按 userInfo / userProfile 拆成两次 PUT） */
export interface UpdateUserInfoRequest {
  nickname?: string;
  realName?: string;
  /** 头像 URL（图床上传后的公开地址，与后端 UserInfoUpdateRequest.avatar 对齐） */
  avatar?: string;
  sex?: Sex;
  university?: string | null;
  college?: string;
  major?: string;
  className?: string;
  enrollmentYear?: string;
  degreeLevel?: DegreeLevel;
  academicTitle?: string;
}
