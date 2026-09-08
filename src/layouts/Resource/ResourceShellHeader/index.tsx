import NavigationControls from '@/components/Sidebar/_common/header/NavigationControls';
import { useDesktopWindowState } from '@/hooks/useDesktopWindowState';
import { cn } from '@/utils/cn';

import ResourceHeader from '../ResourceHeader';
import type { ResourceShellHeaderProps } from './index.type';
import styles from './style.module.less';

function ResourceShellHeader({
  resource,
  inlineTitle,
  extra,
  resourceSidePanelActions,
  titleBlock,
  canGoBack = false,
  canGoForward = false,
  leftSidebarCollapsed = false,
  headerRef,
  onGoBack,
  onGoForward,
  onToggleLeftSidebar,
  className,
}: ResourceShellHeaderProps) {
  const desktopWindow = useDesktopWindowState();

  const titleBarInsetStart =
    desktopWindow.hasTitleBarInset && desktopWindow.titleBarInsetSide === 'start';
  /** Win：挂 end 槽位；具体留白 px 由 headerRef 上的 CSS 变量驱动 */
  const titleBarInsetEnd =
    desktopWindow.hasTitleBarInset && desktopWindow.titleBarInsetSide === 'end';

  return (
    <header
      ref={headerRef}
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

export default ResourceShellHeader;
