import type { EnumValue } from '@/utils/enum';
import { createEnum } from '@/utils/enum';

/** 邮箱后缀类型（发起邮箱验证用）：0 -> @m.fudan.edu.cn；1 -> @fudan.edu.cn */
export const EMAIL_SUFFIX = createEnum([
  { value: 0, key: 'M_FUDAN', label: '@m.fudan.edu.cn' },
  { value: 1, key: 'FUDAN', label: '@fudan.edu.cn' },
] as const);

/** 身份类型 */
export const IDENTITY = createEnum([
  { value: 1, key: 'STUDENT', label: '学生' },
  { value: 2, key: 'TEACHER', label: '教师' },
  { value: 3, key: 'ADMIN', label: '管理员' },
] as const);

/** 性别 */
export const SEX = createEnum([
  { value: 0, key: 'MALE', label: '男' },
  { value: 1, key: 'FEMALE', label: '女' },
  { value: 2, key: 'UNKNOWN', label: '未知' },
] as const);

/** 账号状态 */
export const USER_STATUS = createEnum([
  { value: -1, key: 'UNVERIFIED', label: '未验证' },
  { value: -2, key: 'BANNED', label: '封禁' },
  { value: 1, key: 'NORMAL', label: '正常' },
] as const);

/** 认证方式（与后端 UserVerificationMode 对齐） */
export const USER_VERIFICATION = createEnum([
  { value: 'EDU_EMAIL', key: 'EDU_EMAIL', label: '邮箱认证' },
  { value: 'FDU_UIS_SYS', key: 'FDU_UIS_SYS', label: 'UIS认证' },
] as const);
export type UserVerificationMode = EnumValue<typeof USER_VERIFICATION>;

/** 用户反馈类型选项 */
export const FEEDBACK_TYPE = createEnum([
  { value: 'BUG_REPORT', key: 'BUG_REPORT', label: '问题报错' },
  { value: 'SUGGESTION', key: 'SUGGESTION', label: '功能建议' },
  { value: 'CONSULTATION', key: 'CONSULTATION', label: '使用咨询' },
  { value: 'COMPLAINT', key: 'COMPLAINT', label: '服务投诉' },
  { value: 'OTHER', key: 'OTHER', label: '其他' },
] as const);
export type FeedbackType = EnumValue<typeof FEEDBACK_TYPE>;

/** 学历层次（学生用） */
export const DEGREE = createEnum([
  { value: 0, key: 'UNKNOWN', label: '未知' },
  { value: 1, key: 'UNDERGRADUATE', label: '本科' },
  { value: 2, key: 'MASTER', label: '硕士' },
  { value: 3, key: 'DOCTOR', label: '博士' },
] as const);

export type DegreeLevel = EnumValue<typeof DEGREE>;
