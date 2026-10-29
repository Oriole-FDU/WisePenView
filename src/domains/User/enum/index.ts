import type { EnumValue } from '@/utils/type/enum';
import { createEnum } from '@/utils/type/enum';

/** 身份类型 */
export const IDENTITY = createEnum([
  { value: 1, key: 'STUDENT' },
  { value: 2, key: 'TEACHER' },
  { value: 3, key: 'ADMIN' },
] as const);

/** 性别 */
export const SEX = createEnum([
  { value: 'MALE', key: 'MALE' },
  { value: 'FEMALE', key: 'FEMALE' },
  { value: 'UNKNOWN', key: 'UNKNOWN' },
] as const);
export type Sex = EnumValue<typeof SEX>;

/** 账号状态 */
export const USER_STATUS = createEnum([
  { value: -1, key: 'UNVERIFIED' },
  { value: -2, key: 'BANNED' },
  { value: 1, key: 'NORMAL' },
] as const);

/** 认证方式（与后端 UserVerificationMode 对齐） */
export const USER_VERIFICATION = createEnum([
  { value: 'EDU_EMAIL', key: 'EDU_EMAIL' },
  { value: 'FDU_UIS_SYS', key: 'FDU_UIS_SYS' },
  { value: 'CAMPUS_IDENTITY_PROVIDER', key: 'CAMPUS_IDENTITY_PROVIDER' },
] as const);
export type UserVerificationMode = EnumValue<typeof USER_VERIFICATION>;

/** 认证提供方（与后端 verificationProviderCode 对齐） */
export const USER_VERIFICATION_PROVIDER = createEnum([
  { value: 'FUDAN_UIS', key: 'FUDAN_UIS' },
] as const);
export type UserVerificationProvider = EnumValue<typeof USER_VERIFICATION_PROVIDER>;

/** 用户反馈类型选项 */
export const FEEDBACK_TYPE = createEnum([
  { value: 'BUG_REPORT', key: 'BUG_REPORT' },
  { value: 'SUGGESTION', key: 'SUGGESTION' },
  { value: 'CONSULTATION', key: 'CONSULTATION' },
  { value: 'COMPLAINT', key: 'COMPLAINT' },
  { value: 'OTHER', key: 'OTHER' },
] as const);
export type FeedbackType = EnumValue<typeof FEEDBACK_TYPE>;

/** 学历层次（学生用） */
export const DEGREE = createEnum([
  { value: 'UNKNOWN', key: 'UNKNOWN' },
  { value: 'UNDERGRADUATE', key: 'UNDERGRADUATE' },
  { value: 'MASTER', key: 'MASTER' },
  { value: 'DOCTOR', key: 'DOCTOR' },
] as const);

export type DegreeLevel = EnumValue<typeof DEGREE>;
