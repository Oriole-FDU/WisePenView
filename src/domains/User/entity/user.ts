import type { DegreeLevel, IdentityType, Sex, UserStatus, UserVerificationMode } from '../enum';

// 只存储需要的用户字段；id 用 string 避免大数精度丢失
export interface User {
  id: string;
  username: string;
  nickname?: string;
  avatar?: string;
  identityType: IdentityType;
  realName?: string;
  campusNo?: string;
  /** 当前用户自己的邀请码，用于生成邀请链接 */
  inviteCode?: string;
}

/** 后端 UserDisplayBase：用于作者/创建者等轻量展示 */
export interface UserDisplayBase {
  nickname?: string;
  realName?: string;
  avatar?: string;
  identityType?: IdentityType;
}

/** 用户搜索结果：用于选择接收人、协作者等轻量用户选择场景。 */
export interface UserSearchUser extends UserDisplayBase {
  userId: string;
  username: string;
}

export interface UserAccountInfo {
  nickname?: string;
  realName?: string;
  avatar?: string;
  identityType: IdentityType;
  username: string;
  campusNo?: string;
  email?: string;
  mobile?: string;
  verificationMode: UserVerificationMode | null;
  /** 校园身份提供方的开放编码，例如 FUDAN_UIS，不以单一学校做联合类型兜底。 */
  verificationProviderCode: string | null;
  status: UserStatus;
}

export interface UserProfileInfo {
  sex?: Sex;
  inviteCode?: string;
  university?: string | null;
  college?: string;
  major?: string;
  className?: string;
  enrollmentYear?: string;
  degreeLevel?: DegreeLevel;
  academicTitle?: string;
}

/** 账号页使用的稳定前端实体，已脱离后端 getUserInfo 原始响应结构。 */
export interface UserAccountProfile {
  id: string;
  userInfo: UserAccountInfo;
  userProfile: UserProfileInfo;
  readonlyFields: string[];
}
