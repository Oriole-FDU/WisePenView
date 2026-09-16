import { create } from 'zustand';

import type { ResourceChatContext } from '@/components/business/ChatPanel/ResourceChatProtocol';
import { registerStore } from '@/store/lifecycle';

interface ResourceChatProtocolState {
  context?: ResourceChatContext;
  setContext: (context: ResourceChatContext) => void;
  clearContext: (context?: ResourceChatContext) => void;
}

const DEFAULT_STATE = {
  context: undefined,
};

export const useResourceChatProtocolStore = create<ResourceChatProtocolState>()((set) => ({
  ...DEFAULT_STATE,
  setContext: (context) => set({ context }),
  clearContext: (context) =>
    set((state) => (context && state.context !== context ? state : DEFAULT_STATE)),
}));

const resetResourceChatProtocolStore = (): void => {
  useResourceChatProtocolStore.setState(DEFAULT_STATE);
};

registerStore({
  id: 'resource.chat-protocol',
  scope: 'tab',
  reset: resetResourceChatProtocolStore,
});
