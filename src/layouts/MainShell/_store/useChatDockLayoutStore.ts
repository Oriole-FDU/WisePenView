import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { registerStore } from '@/store/lifecycle';
import { createStoreJSONStorage } from '@/store/persistence';

/**
 * 聊天面板 dock 的折叠与宽度。
 *
 * 归属应用壳而非 ChatPanel：ChatDockLayout（资源路由与课程学习页）、顶栏开关和 ChatPanel 自身
 * 都要读写同一份布局，面板只是按该布局渲染的消费者。
 */
interface ChatDockLayoutState {
  chatPanelCollapsed: boolean;
  chatPanelWidth: number;
  setChatPanelCollapsed: (collapsed: boolean) => void;
  setChatPanelWidth: (width: number) => void;
}

const DEFAULT_CHAT_DOCK_LAYOUT_STATE: Pick<
  ChatDockLayoutState,
  'chatPanelCollapsed' | 'chatPanelWidth'
> = {
  chatPanelCollapsed: true,
  chatPanelWidth: 480,
};

export const useChatDockLayoutStore = create<ChatDockLayoutState>()(
  persist(
    (set) => ({
      ...DEFAULT_CHAT_DOCK_LAYOUT_STATE,
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
    }),
    {
      name: 'chat-panel',
      storage: createStoreJSONStorage('tab'),
      version: 1,
      migrate: () => DEFAULT_CHAT_DOCK_LAYOUT_STATE,
    }
  )
);

const resetChatDockLayoutStore = (): void => {
  useChatDockLayoutStore.setState(DEFAULT_CHAT_DOCK_LAYOUT_STATE);
};

registerStore({
  id: 'main-shell.chat-dock-layout',
  scope: 'tab',
  reset: resetChatDockLayoutStore,
});
