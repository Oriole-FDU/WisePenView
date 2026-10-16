import { create } from 'zustand';

import { registerStore } from '@/store/lifecycle';

/**
 * 会话历史刷新信号。
 *
 * 归属 AppLayout：Chat 在新建会话收到首个可渲染内容时递增版本，
 * 同一壳层下的会话列表（AppSidebar / SessionTab）订阅该版本重新加载。
 * 两个组件都只依赖这份协议，不互相引用对方的内部状态。
 */
interface ChatSessionHistoryRefreshState {
  refreshVersion: number;
  requestRefresh: () => void;
}

const DEFAULT_CHAT_SESSION_HISTORY_REFRESH_STATE = {
  refreshVersion: 0,
};

export const useChatSessionHistoryRefreshStore = create<ChatSessionHistoryRefreshState>()(
  (set) => ({
    ...DEFAULT_CHAT_SESSION_HISTORY_REFRESH_STATE,
    requestRefresh: () => set((state) => ({ refreshVersion: state.refreshVersion + 1 })),
  })
);

const resetChatSessionHistoryRefreshStore = (): void => {
  useChatSessionHistoryRefreshStore.setState(DEFAULT_CHAT_SESSION_HISTORY_REFRESH_STATE);
};

registerStore({
  id: 'app-layout.chat-session-history-refresh',
  scope: 'tab',
  reset: resetChatSessionHistoryRefreshStore,
});
