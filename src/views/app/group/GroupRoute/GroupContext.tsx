import { createContext, type ReactNode, useContext } from 'react';

import type { Group, GroupResConfig } from '@/domains/Group';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

export type GroupCurrentUserRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface GroupContextValue {
  group: Group;
  currentUserRole: GroupCurrentUserRole;
  groupResConfig: GroupResConfig;
  refreshGroup: () => void;
}

interface GroupContextProviderProps extends GroupContextValue {
  children: ReactNode;
}

export const GroupContext = createContext<GroupContextValue | null>(null);

export function GroupContextProvider({
  group,
  currentUserRole,
  groupResConfig,
  refreshGroup,
  children,
}: GroupContextProviderProps) {
  return (
    <GroupContext value={{ group, currentUserRole, groupResConfig, refreshGroup }}>
      {children}
    </GroupContext>
  );
}

export const useGroupContext = (): GroupContextValue => {
  const value = useContext(GroupContext);
  if (!value) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'useGroupContext must be used within GroupContext.Provider',
    });
  }
  return value;
};
