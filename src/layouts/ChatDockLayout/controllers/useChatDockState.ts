import { useChatDockLayoutStore } from '@/layouts/MainShell/_store/useChatDockLayoutStore';

/** 对话 dock 的响应式状态：供页面顶栏开关、根容器样式等消费。 */
export function useChatDockState() {
  const collapsed = useChatDockLayoutStore((state) => state.chatPanelCollapsed);
  const setCollapsed = useChatDockLayoutStore((state) => state.setChatPanelCollapsed);

  return {
    collapsed,
    open: !collapsed,
    toggle: () => setCollapsed(!collapsed),
    openPanel: () => setCollapsed(false),
    collapsePanel: () => setCollapsed(true),
  };
}
