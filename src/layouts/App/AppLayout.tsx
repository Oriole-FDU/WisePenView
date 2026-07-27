import { APP_MAIN_MIN_WIDTH, LAYOUT_DENSITY, resolveLayoutDensity } from '@/constants/layoutScale';
import { useSystemLayoutStore } from '@/layouts/_common/_store/useSystemLayoutStore';
import AppSidebar from '@/layouts/_common/Sidebar/AppSidebar';
import {
  clampSidebarWidth,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
} from '@/layouts/_common/Sidebar/sidebarLayoutConfig';
import {
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
} from '@/layouts/_common/SystemResizable';
import { useCompactSidebarCollapse } from '@/layouts/_common/useCompactSidebarCollapse';
import { useResizablePanelSize } from '@/layouts/_common/useResizablePanelSize';
import { useAppNavigation } from '@/layouts/AppNavigation/AppNavigationContext';
import AppNavigationControls from '@/layouts/AppNavigation/AppNavigationControls';
import clsx from 'clsx';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  Layout,
  LayoutChangedMeta,
  PanelImperativeHandle,
  PanelSize,
} from 'react-resizable-panels';
import { Outlet } from 'react-router-dom';
import styles from './AppLayout.module.less';

function AppLayout() {
  const { t } = useTranslation('shell');
  const appNavigation = useAppNavigation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () =>
      typeof window !== 'undefined' &&
      resolveLayoutDensity(window.innerWidth) === LAYOUT_DENSITY.COMPACT
  );
  const storedSidebarWidth = useSystemLayoutStore((state) => state.appSidebarWidth);
  const setSidebarWidth = useSystemLayoutStore((state) => state.setAppSidebarWidth);
  const sidebarPanelRef = useRef<PanelImperativeHandle | null>(null);
  const pendingSidebarWidthRef = useRef<number | null>(null);
  const sidebarWidth = clampSidebarWidth(storedSidebarWidth);
  const sidebarPanelSize = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth;

  const persistSidebarWidthFromPanel = () => {
    const currentWidth = sidebarPanelRef.current?.getSize().inPixels;
    if (currentWidth == null) return;
    const nextSidebarWidth = clampSidebarWidth(currentWidth);
    if (nextSidebarWidth > SIDEBAR_MIN_WIDTH || sidebarWidth === SIDEBAR_MIN_WIDTH) {
      setSidebarWidth(nextSidebarWidth);
    }
  };

  const { density, markSidebarUserOverride } = useCompactSidebarCollapse({
    sidebarCollapsed,
    setSidebarCollapsed,
    onAutoCollapse: persistSidebarWidthFromPanel,
  });

  useResizablePanelSize({
    panelRef: sidebarPanelRef,
    size: sidebarPanelSize,
  });

  const handleSidebarToggle = () => {
    markSidebarUserOverride();
    setSidebarCollapsed((collapsed) => {
      if (!collapsed) {
        persistSidebarWidthFromPanel();
      }
      return !collapsed;
    });
  };

  const handleSidebarResize = (panelSize: PanelSize) => {
    if (sidebarCollapsed) return;
    pendingSidebarWidthRef.current = clampSidebarWidth(panelSize.inPixels);
  };

  const handleLayoutChanged = (_layout: Layout, meta: LayoutChangedMeta) => {
    const pendingSidebarWidth = pendingSidebarWidthRef.current;
    pendingSidebarWidthRef.current = null;
    if (sidebarCollapsed || !meta.isUserInteraction || pendingSidebarWidth == null) return;
    setSidebarWidth(pendingSidebarWidth);
  };

  return (
    <div className={styles.root} data-layout-density={density}>
      {sidebarCollapsed ? (
        <div className={styles.collapsedHeaderControls}>
          <AppNavigationControls
            sidebarCollapsed
            canGoBack={appNavigation.canGoBack}
            canGoForward={appNavigation.canGoForward}
            onGoBack={appNavigation.goBack}
            onGoForward={appNavigation.goForward}
            onToggleSidebar={handleSidebarToggle}
          />
        </div>
      ) : null}

      <SystemResizablePanelGroup
        orientation="horizontal"
        className={styles.panelGroup}
        onLayoutChanged={handleLayoutChanged}
      >
        <SystemResizablePanel
          id="app-sidebar"
          panelRef={sidebarPanelRef}
          defaultSize={sidebarPanelSize}
          minSize={sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_MIN_WIDTH}
          maxSize={sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_MAX_WIDTH}
          groupResizeBehavior="preserve-pixel-size"
          className={styles.leftSider}
          aria-label={t('navigation.appSidebar')}
          aria-hidden={sidebarCollapsed ? true : undefined}
          onResize={handleSidebarResize}
        >
          <AppSidebar
            collapsed={sidebarCollapsed}
            canGoBack={appNavigation.canGoBack}
            canGoForward={appNavigation.canGoForward}
            onGoBack={appNavigation.goBack}
            onGoForward={appNavigation.goForward}
            onToggle={handleSidebarToggle}
          />
        </SystemResizablePanel>

        <SystemResizableHandle
          className={clsx(styles.resizeHandle, sidebarCollapsed && styles.resizeHandleCollapsed)}
          disabled={sidebarCollapsed}
        />

        <SystemResizablePanel
          id="app-main"
          minSize={APP_MAIN_MIN_WIDTH}
          className={styles.middleLayout}
        >
          <main className={styles.middleContent}>
            <Outlet />
          </main>
        </SystemResizablePanel>
      </SystemResizablePanelGroup>
    </div>
  );
}

export default AppLayout;
