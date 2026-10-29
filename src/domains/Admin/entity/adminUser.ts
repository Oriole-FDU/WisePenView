import type { UserStatus, UserVerificationMode } from '@/domains/User/enum';

export interface AdminUser {
  id: string;
  username: string;
  nickname?: string;
  realName?: string;
  avatar?: string;
  identityType: number;
  campusNo?: string;
  email?: string;
  mobile?: string;
  verificationMode?: UserVerificationMode | null;
  status: UserStatus;
  createTime?: string;
  updateTime?: string;
}
