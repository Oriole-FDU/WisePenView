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
