import { createContext } from 'react';

import type { Group, GroupResConfig } from '@/domains/Group';

export type GroupCurrentUserRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface GroupContextValue {
  group: Group;
  currentUserRole: GroupCurrentUserRole;
  groupResConfig: GroupResConfig;
  refreshGroup: () => void;
}

export const GroupContext = createContext<GroupContextValue | null>(null);
