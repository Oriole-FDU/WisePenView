import type { ReactNode } from 'react';

import { AppNavigationContext, type AppNavigationContextValue } from './AppNavigationContext';

export function AppNavigationProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AppNavigationContextValue;
}) {
  return <AppNavigationContext.Provider value={value}>{children}</AppNavigationContext.Provider>;
}
