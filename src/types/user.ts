// 只存储需要的用户字段；id 用 string 避免大数精度丢失
export interface User {
  id: string;
  username: string;
  nickname?: string;
  avatar?: string;
  identityType: number;
  realName?: string;
  campusNo?: string;
}

/** 后端 UserDisplayBase：用于作者/创建者等轻量展示 */
export interface UserDisplayBase {
  nickname?: string;
  realName?: string;
  avatar?: string;
  identityType?: number;
}
