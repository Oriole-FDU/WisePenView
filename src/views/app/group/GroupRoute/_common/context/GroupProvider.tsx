import type { ReactNode } from 'react';

import { GroupContext, type GroupContextValue } from './GroupContext';

export function GroupProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: GroupContextValue;
}) {
  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}
