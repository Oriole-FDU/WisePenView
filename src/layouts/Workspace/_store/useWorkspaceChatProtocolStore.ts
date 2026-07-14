import type { ResourceChatContext } from '@/components/ChatPanel/ResourceChatProtocol';
import { registerStore } from '@/store/lifecycle';
import { create } from 'zustand';

interface WorkspaceChatProtocolState {
  context?: ResourceChatContext;
  setContext: (context: ResourceChatContext) => void;
  clearContext: (context?: ResourceChatContext) => void;
}

const DEFAULT_STATE = {
  context: undefined,
};

export const useWorkspaceChatProtocolStore = create<WorkspaceChatProtocolState>()((set) => ({
  ...DEFAULT_STATE,
  setContext: (context) => set({ context }),
  clearContext: (context) =>
    set((state) => (context && state.context !== context ? state : DEFAULT_STATE)),
}));

const resetWorkspaceChatProtocolStore = (): void => {
  useWorkspaceChatProtocolStore.setState(DEFAULT_STATE);
};

registerStore({
  id: 'workspace.chat-protocol',
  scope: 'tab',
  reset: resetWorkspaceChatProtocolStore,
});
