import type { UserGroupQuota } from '@/types/quota';

export type { UserGroupQuota };

export interface QuotaByGroupProps {
  quotas?: UserGroupQuota[];
  pagination?: {
    defaultPageSize?: number;
    pageSizeOptions?: number[];
    showSizeChanger?: boolean;
  };
  total?: number;
  current?: number;
  pageSize?: number;
  onPageChange?: (page: number, pageSize: number) => void;
  loading?: boolean;
}
