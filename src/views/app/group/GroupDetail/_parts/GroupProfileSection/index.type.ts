import type { Group } from '@/domains/Group';

export interface GroupProfileSectionProps {
  group: Group;
  groupId: string;
  canEdit: boolean;
  onSuccess: () => void;
}
