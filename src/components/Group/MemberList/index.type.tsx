import type { GroupMember } from '@/types/group';
import type { PermissionConfig } from './PermissionConfig';
import type { MemberListPaginationConfig } from './MemberListTable/index.type';

export interface MemberListProps {
  permissionConfig: PermissionConfig;
  pagination?: MemberListPaginationConfig;
  groupId: string;
  inviteCode?: string;
  /** 预览模式：传入 mock 数据，跳过 API 请求 */
  mockMembers?: GroupMember[];
}
