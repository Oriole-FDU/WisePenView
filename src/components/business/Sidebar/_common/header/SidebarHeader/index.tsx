import { clsx } from 'clsx';

import { useDesktopWindowState } from '@/hooks/useDesktopWindowState';
import { COLOR_SCHEME_LOGO_SRC, useAppTheme, useColorScheme } from '@/theme';

import NavigationControls from '../NavigationControls';
import type { SidebarHeaderProps } from './index.type';
import styles from './style.module.less';

function SidebarHeader({
  collapsed,
  canGoBack = false,
  canGoForward = false,
  onGoBack,
  onGoForward,
  onToggle,
  nav,
  labelsHidden = false,
}: SidebarHeaderProps) {
  const hasNav = Boolean(nav);
  const desktopWindow = useDesktopWindowState();
  const { resolvedTheme } = useAppTheme();
  const { colorScheme } = useColorScheme();
  const logoContent = (
    <img
      className={styles.logoImage}
      src={COLOR_SCHEME_LOGO_SRC[colorScheme][resolvedTheme]}
      alt="WisePen"
      draggable={false}
    />
  );
  const showHistoryControls = Boolean(onGoBack && onGoForward);
  const navigationControls = onToggle ? (
    <NavigationControls
      sidebarCollapsed={collapsed}
      showHistory={showHistoryControls && desktopWindow.isDesktop}
      canGoBack={canGoBack}
      canGoForward={canGoForward}
      onGoBack={onGoBack}
      onGoForward={onGoForward}
      onToggleSidebar={onToggle}
    />
  ) : null;

  return (
    <div
      className={clsx(
        styles.header,
        desktopWindow.isDesktop && styles.desktopHeader,
        desktopWindow.hasTitleBarInset &&
          desktopWindow.titleBarInsetSide === 'start' &&
          styles.titleBarInsetStart
      )}
    >
      {desktopWindow.isDesktop ? (
        <>
          <div className={clsx(styles.headerTop, collapsed && styles.collapsedHeaderTop)}>
            {navigationControls}
          </div>
          {!collapsed ? (
            <div className={clsx(styles.logo, labelsHidden && styles.logoHidden)}>
              {logoContent}
            </div>
          ) : null}
        </>
      ) : (
        <div className={clsx(styles.webHeader, collapsed && styles.collapsedWebHeader)}>
          {!collapsed ? (
            <div className={clsx(styles.logo, labelsHidden && styles.logoHidden)}>
              {logoContent}
            </div>
          ) : null}
          {navigationControls}
        </div>
      )}

      {hasNav ? (
        <div className={clsx(styles.headerNav, collapsed && styles.headerNavCollapsed)}>{nav}</div>
      ) : null}
    </div>
  );
}

export default SidebarHeader;
