import NavigationControls from '@/components/business/Sidebar/_common/header/NavigationControls';
import { useDesktopWindowState } from '@/hooks/useDesktopWindowState';
import { cn } from '@/utils/cn';

import ResourceHeader from '../ResourceHeader';
import type { ResourceWorkspaceHeaderProps } from './index.type';
import styles from './style.module.less';

function ResourceWorkspaceHeader({
  resource,
  inlineTitle,
  extra,
  resourceSidePanelActions,
  titleBlock,
  canGoBack = false,
  canGoForward = false,
  leftSidebarCollapsed = false,
  onGoBack,
  onGoForward,
  onToggleLeftSidebar,
  className,
}: ResourceWorkspaceHeaderProps) {
  const desktopWindow = useDesktopWindowState();

  const titleBarInsetStart =
    desktopWindow.hasTitleBarInset && desktopWindow.titleBarInsetSide === 'start';
  /** Win：挂 end 槽位；具体留白继承宿主的 CSS 变量。 */
  const titleBarInsetEnd =
    desktopWindow.hasTitleBarInset && desktopWindow.titleBarInsetSide === 'end';

  return (
    <header
      className={cn(
        styles.root,
        desktopWindow.isDesktop && styles.desktopRoot,
        titleBarInsetStart && styles.titleBarInsetStartAligned,
        leftSidebarCollapsed && titleBarInsetStart && styles.titleBarInsetStart,
        titleBarInsetEnd && styles.titleBarInsetEnd,
        leftSidebarCollapsed &&
          desktopWindow.isDesktop &&
          desktopWindow.isFullScreen &&
          styles.desktopFullScreenRoot,
        className
      )}
    >
      <div className={styles.bar}>
        <div className={styles.toolbar}>
          {leftSidebarCollapsed && onToggleLeftSidebar && onGoBack && onGoForward ? (
            <div className={styles.leftSidebarControls}>
              <NavigationControls
                sidebarCollapsed
                canGoBack={canGoBack}
                canGoForward={canGoForward}
                onGoBack={onGoBack}
                onGoForward={onGoForward}
                onToggleSidebar={onToggleLeftSidebar}
              />
            </div>
          ) : null}
          {resource ? (
            <div className={styles.resourceHeader}>
              <ResourceHeader {...resource} trailingActions={resourceSidePanelActions} />
            </div>
          ) : (
            <div className={styles.toolbarMiddle}>
              {inlineTitle ? <div className={styles.inlineTitle}>{inlineTitle}</div> : null}
            </div>
          )}
          {resource ? null : (
            <div className={styles.toolbarEnd}>
              {extra}
              {resourceSidePanelActions}
            </div>
          )}
        </div>
      </div>
      {titleBlock ? (
        <div className={styles.titleBlock}>
          <div className={styles.titleBlockInner}>{titleBlock}</div>
        </div>
      ) : null}
    </header>
  );
}

export default ResourceWorkspaceHeader;
