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

// API 返回的完整用户信息（包含所有字段，但不存储）
export interface APIUserInfo {
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
