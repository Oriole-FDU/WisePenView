import { clsx } from 'clsx';

import NavigationControls from '@/components/business/Sidebar/_common/header/NavigationControls';
import { useDesktopWindowState } from '@/hooks/useDesktopWindowState';

import ResourceToolbar from '../ResourceToolbar';
import type { ResourceLayoutHeaderProps } from './index.type';
import styles from './style.module.less';

/** 布局顶栏外壳：装配宿主导航、资源工具栏与标题区，并处理桌面窗口留白。 */
function ResourceLayoutHeader({
  resourceToolbar,
  inlineTitle,
  extra,
  sidePanelActions,
  titleBlock,
  canGoBack = false,
  canGoForward = false,
  leftSidebarCollapsed = false,
  onGoBack,
  onGoForward,
  onToggleLeftSidebar,
  className,
}: ResourceLayoutHeaderProps) {
  const desktopWindow = useDesktopWindowState();

  const titleBarInsetStart =
    desktopWindow.hasTitleBarInset && desktopWindow.titleBarInsetSide === 'start';
  /** Win：挂 end 槽位；具体留白继承宿主的 CSS 变量。 */
  const titleBarInsetEnd =
    desktopWindow.hasTitleBarInset && desktopWindow.titleBarInsetSide === 'end';

  return (
    <header
      className={clsx(
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
          {resourceToolbar ? (
            <div className={styles.resourceToolbar}>
              <ResourceToolbar {...resourceToolbar} trailingActions={sidePanelActions} />
            </div>
          ) : (
            <div className={styles.toolbarMiddle}>
              {inlineTitle ? <div className={styles.inlineTitle}>{inlineTitle}</div> : null}
            </div>
          )}
          {resourceToolbar ? null : (
            <div className={styles.toolbarEnd}>
              {extra}
              {sidePanelActions}
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

export default ResourceLayoutHeader;
