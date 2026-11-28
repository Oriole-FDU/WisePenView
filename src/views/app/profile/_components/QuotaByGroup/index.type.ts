import type { UserGroupQuota } from '@/domains/Group';

export type { UserGroupQuota };

export interface QuotaByGroupProps {
  pagination?: {
    defaultPageSize?: number;
  };
}
