import type { ReactNode } from 'react';

interface MainSidebarRenderState {
  onToggle: () => void;
  collapsed: boolean;
  motionPhase: 'expanded' | 'collapsing' | 'collapsed' | 'expanding';
}

interface MainDrawerSidebarRenderState {
  /** 窄屏侧栏项被选中后关闭 Drawer */
  onNavigate: () => void;
}

export interface MainShellProps {
  /** panel group 的 DOM id，同时作为布局标识 */
  panelGroupId: string;
  /** 侧栏 aria-label */
  sidebarAriaLabel: string;
  /** 主内容区最小宽度 */
  mainMinWidth?: number;
  /** 主内容区自身滚动；页面自声明框架（如 AppScrollablePageLayout）时为 false */
  mainContentScroll?: boolean;
  /** 桌面侧栏内容；展开、过渡与折叠窄态都由具体侧栏组件维护 */
  renderSidebar: (state: MainSidebarRenderState) => ReactNode;
  /** 窄屏 Drawer 内的侧栏内容 */
  renderDrawerSidebar: (state: MainDrawerSidebarRenderState) => ReactNode;
  /** 窄屏顶栏标题，不传则不渲染窄屏顶栏 */
  mobileHeaderTitle?: ReactNode;
  children: ReactNode;
}
