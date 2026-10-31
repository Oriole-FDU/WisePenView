import type { EnumValue } from '@/utils/type/enum';
import { defineEnum } from '@/utils/type/enum';

/** 身份类型 */
export const IDENTITY = defineEnum({
  STUDENT: 1,
  TEACHER: 2,
  ADMIN: 3,
} as const);

/** 性别 */
export const SEX = defineEnum(['MALE', 'FEMALE', 'UNKNOWN'] as const);
export type Sex = EnumValue<typeof SEX>;

/** 账号状态 */
export const USER_STATUS = defineEnum(['NORMAL', 'UNIDENTIFIED', 'BANNED'] as const);
export type UserStatus = EnumValue<typeof USER_STATUS>;

/** 认证方式（与后端 UserVerificationMode 对齐） */
export const USER_VERIFICATION = defineEnum(['EDU_EMAIL', 'CAMPUS_IDENTITY_PROVIDER'] as const);
export type UserVerificationMode = EnumValue<typeof USER_VERIFICATION>;

/** 认证提供方（与后端 verificationProviderCode 对齐） */
export const USER_VERIFICATION_PROVIDER = defineEnum(['FUDAN_UIS'] as const);
export type UserVerificationProvider = EnumValue<typeof USER_VERIFICATION_PROVIDER>;

/** 用户反馈类型选项 */
export const FEEDBACK_TYPE = defineEnum([
  'BUG_REPORT',
  'SUGGESTION',
  'CONSULTATION',
  'COMPLAINT',
  'OTHER',
] as const);
export type FeedbackType = EnumValue<typeof FEEDBACK_TYPE>;

/** 学历层次（学生用） */
export const DEGREE = defineEnum(['UNKNOWN', 'UNDERGRADUATE', 'MASTER', 'DOCTOR'] as const);

export type DegreeLevel = EnumValue<typeof DEGREE>;
