import type { ReactNode } from 'react';

import type { ResourceHeaderProps } from '../ResourceHeader/index.type';

export interface ResourceWorkspaceHeaderProps {
  /** 资源工作区顶栏；存在时替代 inlineTitle 与 extra。 */
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
  onGoBack?: () => void;
  onGoForward?: () => void;
  onToggleLeftSidebar?: () => void;
  className?: string;
}
