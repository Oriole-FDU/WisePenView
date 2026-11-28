import type { GroupRole } from '@/components/business/Group/GroupDisplayConfig';
import type { Group, GroupResConfig } from '@/domains/Group';

export interface GroupDescriptionSettingsProps {
  group: Group;
  groupId: string;
  groupResConfig: GroupResConfig;
  currentUserRole: GroupRole;
  onRefresh: () => void;
}
