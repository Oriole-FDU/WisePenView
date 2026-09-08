/** Navigation controls 包含侧边栏展开/收起和历史记录导航 */
export interface NavigationControlsProps {
  sidebarCollapsed: boolean;
  showHistory?: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
  onToggleSidebar: () => void;
}
