import type { PermissionConfig } from './PermissionConfig';
import type { MemberListPaginationConfig } from './MemberListTable/index.type';

export interface MemberListProps {
  permissionConfig: PermissionConfig;
  pagination?: MemberListPaginationConfig;
  groupId: string;
  inviteCode?: string;
}
