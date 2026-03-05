import type { EmailSuffixType } from '@/types/user';

/** 确认邮箱验证请求参数 */
export interface ConfirmEmailVerifyRequest {
  token: string;
}

/** 发起邮箱验证请求参数 */
export interface SendEmailVerifyRequest {
  /** 0 -> @m.fudan.edu.cn；1 -> @fudan.edu.cn */
  suffixType: EmailSuffixType;
}

/** 更新用户档案请求参数（仅基本档案可编辑字段） */
export interface UpdateUserProfileRequest {
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

/** 获取用户信息接口的响应 data 类型 */
export interface GetUserInfoResponse {
  id: number;
  username: string;
  nickname?: string;
  avatar?: string;
  identityType: number;
  realName?: string;
  campusNo?: string;
  academicTitle?: string;
  className?: string;
  college?: string;
  createTime?: string;
  degreeLevel?: number;
  email?: string;
  enrollmentYear?: string;
  major?: string;
  mobile?: string;
  password?: string | null;
  sex?: number;
  status?: number;
  university?: string | null;
}
