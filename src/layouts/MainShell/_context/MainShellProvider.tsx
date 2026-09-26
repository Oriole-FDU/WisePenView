import type { ReactNode } from 'react';

import { MainShellContext, type MainShellContextValue } from './MainShellContext';

export function MainShellProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: MainShellContextValue;
}) {
  return <MainShellContext.Provider value={value}>{children}</MainShellContext.Provider>;
}
