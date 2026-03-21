import type { GroupMember } from '@/types/group';
import type { PermissionConfig } from '../PermissionConfig';

export interface MemberListPaginationConfig {
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  showSizeChanger?: boolean;
}

export interface MemberListTableProps {
  groupId: string | number;
  permissionConfig: PermissionConfig;
  pagination?: MemberListPaginationConfig;
  isEditMode: boolean;
  selectedRowKeys: (string | number)[];
  onSelectedRowKeysChange: (keys: (string | number)[]) => void;
  onSelectedMembersChange?: (members: GroupMember[]) => void;
  onTotalChange?: (total: number) => void;
  /** 变化时触发重新拉取成员列表（如编辑权限、删除成员、分配配额成功后递增） */
  refreshTrigger?: number;
}
