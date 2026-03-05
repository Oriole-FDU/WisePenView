/** 邮箱后缀类型：0 -> @m.fudan.edu.cn；1 -> @fudan.edu.cn */
export type EmailSuffixType = 0 | 1;

// 只存储需要的用户字段
export interface User {
  id: number;
  username: string;
  nickname?: string;
  avatar?: string;
  identityType: number;
  realName?: string;
  campusNo?: string;
}
