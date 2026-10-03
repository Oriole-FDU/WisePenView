import { useChatDockLayoutStore } from '@/layouts/MainShell/_store/useChatDockLayoutStore';

/**
 * 面板布局域：只表达 Chat 自身的收起意图。
 *
 * 折叠态与宽度归应用壳的 dock 布局 store，ResourceHost 与 Course 学习页持有同一份数据。
 */
export function useChatLayout() {
  const setChatPanelCollapsed = useChatDockLayoutStore((state) => state.setChatPanelCollapsed);

  return {
    collapsePanel: () => setChatPanelCollapsed(true),
  };
}
