import { createContext } from 'react';

export interface MainShellContextValue {
  /** 主壳左侧栏是否处于折叠态 */
  sidebarCollapsed: boolean;
  /** 主壳是否处于窄屏布局，此时左侧栏改为 Drawer */
  isMobileLayout: boolean;
  /** 切换主壳左侧栏：桌面端折叠/展开侧栏面板，窄屏开关侧栏 Drawer */
  onToggleSidebar: () => void;
}

export const MainShellContext = createContext<MainShellContextValue | null>(null);
