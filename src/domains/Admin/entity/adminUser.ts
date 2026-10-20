import type { UserVerificationMode } from '@/domains/User/enum';

export interface AdminUser {
  id: string;
  username: string;
  nickname: string;
  realName: string | null;
  avatar: string | null;
  identityType: number;
  campusNo: string | null;
  email: string | null;
  mobile: string | null;
  verificationMode: UserVerificationMode | null;
  verificationProviderCode: string | null;
  status: number;
  createTime: string | null;
  updateTime: string | null;
}
