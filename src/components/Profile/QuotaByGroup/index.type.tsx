import type { UserGroupQuota } from '@/domains/Wallet';

export type { UserGroupQuota };

export interface QuotaByGroupProps {
  pagination?: {
    defaultPageSize?: number;
  };
}
