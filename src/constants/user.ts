/** 邮箱后缀类型（发起邮箱验证用）：0 -> @m.fudan.edu.cn；1 -> @fudan.edu.cn */
export const EMAIL_SUFFIX_TYPE = { MOBILE: 0, DESKTOP: 1 } as const;
export const EMAIL_SUFFIX_LABELS: Record<number, string> = {
  0: '@m.fudan.edu.cn',
  1: '@fudan.edu.cn',
};

/** 身份类型 */
export const IDENTITY_TYPE = { STUDENT: 1, TEACHER: 2, ADMIN: 3 } as const;
export const IDENTITY_TYPE_LABELS: Record<number, string> = {
  1: '学生',
  2: '教师',
  3: '管理员',
};
export const getIdentityTypeLabel = (v: number) => IDENTITY_TYPE_LABELS[v] ?? String(v);

/** 性别 */
export const SEX = { UNKNOWN: 0, MALE: 1, FEMALE: 2 } as const;
export const SEX_LABELS: Record<number, string> = {
  0: '未知',
  1: '男',
  2: '女',
};
export const getSexLabel = (v: number) => SEX_LABELS[v] ?? String(v);

/** 账号状态 */
export const USER_STATUS = {
  UNVERIFIED: -1,
  BANNED: -2,
  NORMAL: 1,
} as const;
export const USER_STATUS_LABELS: Record<number, string> = {
  [USER_STATUS.UNVERIFIED]: '未验证',
  [USER_STATUS.BANNED]: '封禁',
  [USER_STATUS.NORMAL]: '正常',
};
export const getStatusLabel = (v: number) => USER_STATUS_LABELS[v] ?? String(v);

/** 学历层次（学生用） */
export const DEGREE_LEVEL = { BACHELOR: 1, MASTER: 2, DOCTOR: 3 } as const;
export const DEGREE_LEVEL_LABELS: Record<number, string> = {
  1: '本科',
  2: '硕士',
  3: '博士',
};
export const getDegreeLevelLabel = (v: number) => DEGREE_LEVEL_LABELS[v] ?? String(v);
