import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { clampChatPanelWidth } from '@/constants/layoutScale';
import { registerStore } from '@/store/lifecycle';
import { createStoreJSONStorage } from '@/store/persistence';

/**
 * 聊天面板 dock 的折叠与宽度。
 *
 * 归属应用壳而非 Chat：ChatDockLayout（资源路由与课程学习页）、顶栏开关和 Chat 自身
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
  chatPanelCollapsed: false,
  chatPanelWidth: 480,
};

/** 折叠态默认值由旧版本的「收起」改为「展开」，迁移时只保留宽度偏好。 */
const migrateChatDockLayoutState = (persisted: unknown): typeof DEFAULT_CHAT_DOCK_LAYOUT_STATE => {
  const state = persisted as Partial<ChatDockLayoutState> | undefined;

  return {
    chatPanelCollapsed: DEFAULT_CHAT_DOCK_LAYOUT_STATE.chatPanelCollapsed,
    chatPanelWidth: clampChatPanelWidth(
      state?.chatPanelWidth ?? DEFAULT_CHAT_DOCK_LAYOUT_STATE.chatPanelWidth
    ),
  };
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
      version: 2,
      migrate: migrateChatDockLayoutState,
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
