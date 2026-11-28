import type { GroupResConfig } from '@/domains/Group';

export interface GroupPermissionSectionProps {
  groupId: string;
  groupResConfig: GroupResConfig;
  onSuccess: () => void;
}
