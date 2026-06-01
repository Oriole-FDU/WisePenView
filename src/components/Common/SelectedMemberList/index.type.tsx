import type { GroupMember } from '@/domains/Group';

export interface SelectedMemberListProps {
  members: GroupMember[];
  isReadOnly?: boolean;
}
