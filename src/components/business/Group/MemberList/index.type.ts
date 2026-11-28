import type { GroupDisplayConfig } from '../GroupDisplayConfig';
import type { MemberListPaginationConfig } from './_parts/MemberListTable/index.type';

export interface MemberListProps {
  groupDisplayConfig: GroupDisplayConfig;
  pagination?: MemberListPaginationConfig;
  groupId: string;
  inviteCode?: string;
}
