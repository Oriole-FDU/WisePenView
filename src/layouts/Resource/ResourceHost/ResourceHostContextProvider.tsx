import type { ReactNode } from 'react';

import { ResourceHostContext, type ResourceHostContextValue } from './ResourceHostContext';

interface ResourceHostContextProviderProps {
  value: ResourceHostContextValue;
  children: ReactNode;
}

export function ResourceHostContextProvider({
  value,
  children,
}: ResourceHostContextProviderProps) {
  return <ResourceHostContext value={value}>{children}</ResourceHostContext>;
}
