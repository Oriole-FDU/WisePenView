import type { ReactNode, Ref } from 'react';

import type { ResourceHeaderProps } from '../ResourceHeader/index.type';

export interface ResourceShellHeaderProps {
  /** 资源页面统一 Header；存在时由 ResourceShellHeader 创建并替代 inlineTitle 与 extra */
  resource?: ResourceHeaderProps;
  /** 工具条中间区：如 PDF 图标 + 文件名 */
  inlineTitle?: ReactNode;
  /** 右侧操作区（分享等） */
  extra?: ReactNode;
  /** 资源内容区右侧栏操作，不控制聊天栏。 */
  resourceSidePanelActions?: ReactNode;
  /** 工具条下方整块区域，如笔记可编辑标题 */
  titleBlock?: ReactNode;
  canGoBack?: boolean;
  canGoForward?: boolean;
  leftSidebarCollapsed?: boolean;
  /** Win：供 useResourceHeaderEndReserve 挂载，写入窗控留白 CSS 变量 */
  headerRef?: Ref<HTMLElement>;
  onGoBack?: () => void;
  onGoForward?: () => void;
  onToggleLeftSidebar?: () => void;
  className?: string;
}
