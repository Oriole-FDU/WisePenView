import { type ReactNode, useState } from 'react';
import { createStore } from 'zustand/vanilla';

import {
  ResourceChatBindingContext,
  type ResourceChatBindingValue,
} from './ResourceChatBindingContext';

export function ResourceChatBindingProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createStore<{ binding?: ResourceChatBindingValue }>(() => ({})));
  return (
    <ResourceChatBindingContext.Provider value={store}>
      {children}
    </ResourceChatBindingContext.Provider>
  );
}
