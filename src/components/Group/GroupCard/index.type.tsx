import type { Group } from '@/types/group';

export interface GroupCardProps {
  group: Group;
  onClick?: (group: Group) => void;
}
