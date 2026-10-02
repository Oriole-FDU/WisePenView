import { create } from 'zustand';

import type { ResourceChatContext } from '@/layouts/Resource/_context/resourceChatModel';
import { registerStore } from '@/store/lifecycle';

interface ResourceChatContextState {
  context?: ResourceChatContext;
  setContext: (context: ResourceChatContext) => void;
  clearContext: (context?: ResourceChatContext) => void;
}

const DEFAULT_STATE = { context: undefined };

export const useResourceChatContextStore = create<ResourceChatContextState>()((set) => ({
  ...DEFAULT_STATE,
  setContext: (context) => set({ context }),
  clearContext: (context) =>
    set((state) => (context && state.context !== context ? state : DEFAULT_STATE)),
}));

registerStore({
  id: 'resource.chat-context',
  scope: 'tab',
  reset: () => useResourceChatContextStore.setState(DEFAULT_STATE),
});
