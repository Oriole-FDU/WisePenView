import { useChatDockLayoutStore } from '@/layouts/MainShell/_store/useChatDockLayoutStore';

/**
 * 对话 dock 的命令式动作。
 *
 * 折叠态与宽度归应用壳 store，页面通过这里读写，不各自直接操作 store。
 */
export const chatDockActions = {
  open: () => useChatDockLayoutStore.getState().setChatPanelCollapsed(false),
  collapse: () => useChatDockLayoutStore.getState().setChatPanelCollapsed(true),
  toggle: () => {
    const state = useChatDockLayoutStore.getState();
    state.setChatPanelCollapsed(!state.chatPanelCollapsed);
  },
};
