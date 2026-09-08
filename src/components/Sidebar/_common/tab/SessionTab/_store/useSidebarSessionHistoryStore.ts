import type { ChatSession, PageResult } from '@/domains/Chat';
import { registerStore } from '@/store/lifecycle';
import { create } from 'zustand';

interface SidebarSessionHistoryState {
  sessionItems: ChatSession[];
  sessionPage: number;
  sessionTotalPage: number;
  setSessionPageResult: (payload: PageResult<ChatSession>, append: boolean) => void;
  removeSession: (sessionId: string) => void;
}

const DEFAULT_SIDEBAR_SESSION_HISTORY_STATE = {
  sessionItems: [] as ChatSession[],
  sessionPage: 1,
  sessionTotalPage: 1,
};

export const useSidebarSessionHistoryStore = create<SidebarSessionHistoryState>()((set) => ({
  ...DEFAULT_SIDEBAR_SESSION_HISTORY_STATE,
  setSessionPageResult: (payload, append) =>
    set((state) => {
      if (!append) {
        return {
          sessionItems: payload.list,
          sessionPage: payload.page,
          sessionTotalPage: payload.totalPage,
        };
      }
      const existingIds = new Set(state.sessionItems.map((item) => item.id));
      const extraItems = payload.list.filter((item) => !existingIds.has(item.id));
      return {
        sessionItems: [...state.sessionItems, ...extraItems],
        sessionPage: payload.page,
        sessionTotalPage: payload.totalPage,
      };
    }),
  removeSession: (sessionId) =>
    set((state) => ({
      sessionItems: state.sessionItems.filter((item) => item.id !== sessionId),
    })),
}));

const resetSidebarSessionHistoryStore = (): void => {
  useSidebarSessionHistoryStore.setState(DEFAULT_SIDEBAR_SESSION_HISTORY_STATE);
};

registerStore({
  id: 'app-sidebar.session-history',
  scope: 'tab',
  reset: resetSidebarSessionHistoryStore,
});
