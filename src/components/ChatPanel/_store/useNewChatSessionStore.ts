import { create } from 'zustand';

import { registerStore } from '@/store/lifecycle';

interface NewChatSessionState {
  newChatSessionId: string | null;
  setNewChatSessionId: (sessionId: string) => void;
  clearNewChatSessionById: (sessionId: string) => void;
}

const DEFAULT_NEW_CHAT_SESSION_STATE: Pick<NewChatSessionState, 'newChatSessionId'> = {
  newChatSessionId: null,
};

export const useNewChatSessionStore = create<NewChatSessionState>()((set) => ({
  ...DEFAULT_NEW_CHAT_SESSION_STATE,

  setNewChatSessionId: (sessionId) => set({ newChatSessionId: sessionId }),
  clearNewChatSessionById: (sessionId) =>
    set((state) => {
      if (state.newChatSessionId !== sessionId) {
        return state;
      }
      return DEFAULT_NEW_CHAT_SESSION_STATE;
    }),
}));

export const clearNewChatSessionStore = (): void => {
  useNewChatSessionStore.setState(DEFAULT_NEW_CHAT_SESSION_STATE);
};

registerStore({
  id: 'chat-panel.new-session',
  scope: 'tab',
  reset: clearNewChatSessionStore,
});
