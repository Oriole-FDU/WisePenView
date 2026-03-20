import type { GetUserInfoResponse } from '@/services/User';

export interface AccountHeaderProps {
  user: GetUserInfoResponse | null;
  onUserInfoUpdated: (data: GetUserInfoResponse) => void;
}
