import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { registerStore } from '@/store/lifecycle';
import { createStoreJSONStorage } from '@/store/persistence';

interface ChatPanelState {
  chatPanelCollapsed: boolean;
  chatPanelWidth: number;
  chatPanelDraftOpen: boolean;
  setChatPanelCollapsed: (collapsed: boolean) => void;
  setChatPanelDraftOpen: (open: boolean) => void;
  setChatPanelWidth: (width: number) => void;
}

const DEFAULT_CHAT_PANEL_STATE: Pick<
  ChatPanelState,
  'chatPanelCollapsed' | 'chatPanelWidth' | 'chatPanelDraftOpen'
> = {
  chatPanelCollapsed: true,
  chatPanelWidth: 600,
  chatPanelDraftOpen: false,
};

export const useChatPanelStore = create<ChatPanelState>()(
  persist(
    (set) => ({
      ...DEFAULT_CHAT_PANEL_STATE,
      setChatPanelCollapsed: (collapsed) =>
        set((state) => {
          if (state.chatPanelCollapsed === collapsed) {
            return state;
          }
          return { chatPanelCollapsed: collapsed };
        }),
      setChatPanelWidth: (width) =>
        set((state) => {
          if (state.chatPanelWidth === width) {
            return state;
          }
          return { chatPanelWidth: width };
        }),
      setChatPanelDraftOpen: (open) =>
        set((state) => {
          if (state.chatPanelDraftOpen === open) {
            return state;
          }
          return { chatPanelDraftOpen: open };
        }),
    }),
    { name: 'chat-panel', storage: createStoreJSONStorage('tab') }
  )
);

const resetChatPanelStore = (): void => {
  useChatPanelStore.setState(DEFAULT_CHAT_PANEL_STATE);
};

registerStore({
  id: 'chat-panel.panel-layout',
  scope: 'tab',
  reset: resetChatPanelStore,
});
