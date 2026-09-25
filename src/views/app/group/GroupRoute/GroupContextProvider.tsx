import type { ReactNode } from 'react';

import { GroupContext, type GroupContextValue } from './GroupContext';

interface GroupContextProviderProps extends GroupContextValue {
  children: ReactNode;
}

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
