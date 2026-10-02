import type { ReactNode } from 'react';

import { ResourceHostContext, type ResourceHostContextValue } from './ResourceHostContext';

export function ResourceHostProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ResourceHostContextValue;
}) {
  return <ResourceHostContext.Provider value={value}>{children}</ResourceHostContext.Provider>;
}
