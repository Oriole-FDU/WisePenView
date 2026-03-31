import type { UserGroupQuota } from '@/types/quota';

export type { UserGroupQuota };

export interface QuotaByGroupProps {
  pagination?: {
    defaultPageSize?: number;
    pageSizeOptions?: number[];
    showSizeChanger?: boolean;
  };
}
