import type { AdminUser } from '@/domains/Admin';

export interface AdminUserTableProps {
  users: AdminUser[];
  loading?: boolean;
  total: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onRowClick: (userId: string) => void;
}
