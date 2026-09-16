import { type CSSProperties, memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  Layout,
  LayoutChangedMeta,
  PanelImperativeHandle,
  PanelSize,
} from 'react-resizable-panels';
import { Outlet, useMatch } from 'react-router-dom';

import NavigationControls from '@/components/business/Sidebar/_common/header/NavigationControls';
import AppSidebar from '@/components/business/Sidebar/AppSidebar';
import {
  APP_MAIN_MIN_WIDTH,
  APP_WEB_SIDEBAR_COLLAPSED_WIDTH,
  clampSidebarWidth,
  LAYOUT_DENSITY,
  resolveLayoutDensity,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_MIN_WIDTH,
} from '@/constants/layoutScale';
import { useDesktopWindowState } from '@/hooks/useDesktopWindowState';
import { useSystemLayoutStore } from '@/layouts/_common/_store/useSystemLayoutStore';
import { focusVisibleSidebarToggle } from '@/layouts/_common/a11y/sidebarToggle';
import SkipToMainLink, { MAIN_CONTENT_ID } from '@/layouts/_common/a11y/SkipToMainLink';
import RouteOutletBoundary from '@/layouts/_common/RouteOutletBoundary';
import {
  RESIZE_TARGET_MINIMUM_SIZE,
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
} from '@/layouts/_common/SystemResizable';
import { useCompactSidebarCollapse } from '@/layouts/_common/useCompactSidebarCollapse';
import { useResizablePanelSize } from '@/layouts/_common/useResizablePanelSize';
import {
  SIDEBAR_COLLAPSE_DURATION_MS,
  useSidebarCollapseMotion,
} from '@/layouts/_common/useSidebarCollapseMotion';
import { useAppNavigation } from '@/layouts/AppNavigation/AppNavigationContext';
import { cn } from '@/utils/cn';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

import styles from './AppLayout.module.less';
import AppResourceShell from './AppResourceShell';

const APP_LAYOUT_PANEL_GROUP_ID = 'app-layout-panels';

type AppMainColumnProps = {
  isDesktop: boolean;
  hasTitleBarInset: boolean;
  titleBarInsetSide: 'start' | 'end' | null;
  showDesktopCollapsedChrome: boolean;
  isResourceRoute: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onToggleSidebar: () => void;
  leftSidebarCollapsed: boolean;
};

/** 侧栏开合时避免连带 Outlet 重渲 */
const AppMainColumn = memo(function AppMainColumn({
  isDesktop,
  hasTitleBarInset,
  titleBarInsetSide,
  showDesktopCollapsedChrome,
  isResourceRoute,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onToggleSidebar,
  leftSidebarCollapsed,
}: AppMainColumnProps) {
  const content = isResourceRoute ? (
    <AppResourceShell
      leftSidebarCollapsed={leftSidebarCollapsed}
      canGoBack={canGoBack}
      canGoForward={canGoForward}
      onGoBack={onGoBack}
      onGoForward={onGoForward}
      onToggleLeftSidebar={onToggleSidebar}
    >
      <RouteOutletBoundary>
        <Outlet />
      </RouteOutletBoundary>
    </AppResourceShell>
  ) : (
    <RouteOutletBoundary>
      <Outlet />
    </RouteOutletBoundary>
  );

  return (
    <SystemResizablePanel
      id="app-main"
      minSize={APP_MAIN_MIN_WIDTH}
      className={styles.middleLayout}
    >
      {isDesktop && !isResourceRoute ? (
        <header
          className={cn(
            styles.desktopHeader,
            hasTitleBarInset && titleBarInsetSide === 'start' && styles.titleBarInsetStart,
            hasTitleBarInset && titleBarInsetSide === 'end' && styles.titleBarInsetEnd
          )}
        >
          {showDesktopCollapsedChrome ? (
            <div className={styles.collapsedHeaderControls}>
              <NavigationControls
                sidebarCollapsed
                canGoBack={canGoBack}
                canGoForward={canGoForward}
                onGoBack={onGoBack}
                onGoForward={onGoForward}
                onToggleSidebar={onToggleSidebar}
              />
            </div>
          ) : null}
        </header>
      ) : null}
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className={cn(styles.middleContent, isResourceRoute && styles.middleContentResource)}
      >
        {content}
      </main>
    </SystemResizablePanel>
  );
});

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
  const pendingFocusSidebarToggleRef = useRef(false);
  const sidebarWidth = clampSidebarWidth(storedSidebarWidth);
  const desktopWindow = useDesktopWindowState();
  const isResourceRoute = useMatch(`${APP_ROUTE_PATH.RESOURCES}/:resourceType/:resourceId`) != null;
  const collapsedSidebarWidth =
    desktopWindow.isDesktop || isResourceRoute
      ? SIDEBAR_COLLAPSED_WIDTH
      : APP_WEB_SIDEBAR_COLLAPSED_WIDTH;
  const {
    panelSize: sidebarPanelSize,
    minSize: sidebarMinSize,
    maxSize: sidebarMaxSize,
    isMotionLockedRef,
    notifyAnimationComplete: notifySidebarAnimationComplete,
  } = useSidebarCollapseMotion({
    collapsed: sidebarCollapsed,
    expandedWidth: sidebarWidth,
    collapsedWidth: collapsedSidebarWidth,
    panelGroupId: APP_LAYOUT_PANEL_GROUP_ID,
  });
  const [liveSidebarWidthPx, setLiveSidebarWidthPx] = useState(sidebarWidth);
  const showDesktopCollapsedChrome = sidebarCollapsed && !isResourceRoute;
  const showWebCollapsedChrome = sidebarCollapsed && !desktopWindow.isDesktop && !isResourceRoute;

  const persistSidebarWidthFromPanel = () => {
    const currentWidth = sidebarPanelRef.current?.getSize().inPixels;
    if (currentWidth == null) return;
    const nextSidebarWidth = clampSidebarWidth(currentWidth);
    if (nextSidebarWidth > SIDEBAR_MIN_WIDTH || sidebarWidth === SIDEBAR_MIN_WIDTH) {
      setLiveSidebarWidthPx(nextSidebarWidth);
      setSidebarWidth(nextSidebarWidth);
    }
  };

  const { density, markSidebarUserOverride } = useCompactSidebarCollapse({
    sidebarCollapsed,
    setSidebarCollapsed,
    onAutoCollapse: persistSidebarWidthFromPanel,
  });

  const handleSidebarAnimationComplete = () => {
    notifySidebarAnimationComplete();
    if (!pendingFocusSidebarToggleRef.current || !sidebarCollapsed) return;
    pendingFocusSidebarToggleRef.current = false;
    focusVisibleSidebarToggle();
  };

  useResizablePanelSize({
    panelRef: sidebarPanelRef,
    size: sidebarPanelSize,
    animate: true,
    durationMs: SIDEBAR_COLLAPSE_DURATION_MS,
    onComplete: handleSidebarAnimationComplete,
  });

  /**
   * @wisepen-manual-effect
   * 执行时机：展开后归还焦点到侧栏内切换按钮。
   * 不可替代原因：收起要等 motion 结束显轨后才能 focus（onComplete）；展开可在 collapsed 翻转后立刻 focus。
   * cleanup：无。
   */
  useEffect(() => {
    if (!pendingFocusSidebarToggleRef.current) return;
    if (sidebarCollapsed) return;
    pendingFocusSidebarToggleRef.current = false;
    focusVisibleSidebarToggle();
  }, [sidebarCollapsed]);

  const handleSidebarToggle = () => {
    pendingFocusSidebarToggleRef.current = true;
    markSidebarUserOverride();
    setSidebarCollapsed((collapsed) => {
      if (!collapsed) {
        persistSidebarWidthFromPanel();
      } else {
        setLiveSidebarWidthPx(sidebarWidth);
      }
      return !collapsed;
    });
  };

  const handleSidebarResize = (panelSize: PanelSize) => {
    if (sidebarCollapsed || isMotionLockedRef.current) return;
    pendingSidebarWidthRef.current = clampSidebarWidth(panelSize.inPixels);
  };

  const handleLayoutChanged = (_layout: Layout, meta: LayoutChangedMeta) => {
    const pendingSidebarWidth = pendingSidebarWidthRef.current;
    pendingSidebarWidthRef.current = null;
    if (sidebarCollapsed || isMotionLockedRef.current) return;

    if (meta.isUserInteraction && pendingSidebarWidth != null) {
      setLiveSidebarWidthPx(pendingSidebarWidth);
      setSidebarWidth(pendingSidebarWidth);
      sidebarPanelRef.current?.resize(pendingSidebarWidth);
      return;
    }

    const currentWidth = sidebarPanelRef.current?.getSize().inPixels;
    if (currentWidth == null || currentWidth >= SIDEBAR_MIN_WIDTH - 0.5) return;
    sidebarPanelRef.current?.resize(SIDEBAR_MIN_WIDTH);
    setLiveSidebarWidthPx(SIDEBAR_MIN_WIDTH);
    setSidebarWidth(SIDEBAR_MIN_WIDTH);
  };

  return (
    <div className={styles.root} data-layout-density={density}>
      <SkipToMainLink />
      <SystemResizablePanelGroup
        id={APP_LAYOUT_PANEL_GROUP_ID}
        orientation="horizontal"
        className={styles.panelGroup}
        resizeTargetMinimumSize={RESIZE_TARGET_MINIMUM_SIZE}
        onLayoutChanged={handleLayoutChanged}
      >
        <SystemResizablePanel
          id="app-sidebar"
          panelRef={sidebarPanelRef}
          defaultSize={sidebarPanelSize}
          minSize={sidebarMinSize}
          maxSize={sidebarMaxSize}
          groupResizeBehavior="preserve-pixel-size"
          className={cn(
            styles.leftSider,
            sidebarCollapsed && !desktopWindow.isDesktop && styles.webCollapsedSider
          )}
          aria-label={t('navigation.appSidebar')}
          aria-hidden={sidebarCollapsed && desktopWindow.isDesktop ? true : undefined}
          onResize={handleSidebarResize}
        >
          {showWebCollapsedChrome ? (
            <header className={styles.webCollapsedSidebar}>
              <NavigationControls
                sidebarCollapsed
                showHistory={false}
                canGoBack={appNavigation.canGoBack}
                canGoForward={appNavigation.canGoForward}
                onGoBack={appNavigation.goBack}
                onGoForward={appNavigation.goForward}
                onToggleSidebar={handleSidebarToggle}
              />
            </header>
          ) : null}
          <div
            className={cn(
              styles.sidebarSlideHost,
              showWebCollapsedChrome && styles.sidebarSlideHostCollapsed
            )}
            inert={sidebarCollapsed || undefined}
          >
            <div
              className={styles.sidebarSlideFrame}
              style={
                {
                  '--sidebar-slide-width': `${liveSidebarWidthPx}px`,
                } as CSSProperties
              }
            >
              <AppSidebar
                canGoBack={appNavigation.canGoBack}
                canGoForward={appNavigation.canGoForward}
                onGoBack={appNavigation.goBack}
                onGoForward={appNavigation.goForward}
                onToggle={handleSidebarToggle}
              />
            </div>
          </div>
        </SystemResizablePanel>

        <SystemResizableHandle
          collapsed={sidebarCollapsed}
          disabled={sidebarCollapsed}
          aria-label={t('navigation.resizeSidebar')}
        />

        <AppMainColumn
          isDesktop={desktopWindow.isDesktop}
          hasTitleBarInset={desktopWindow.hasTitleBarInset}
          titleBarInsetSide={desktopWindow.titleBarInsetSide}
          showDesktopCollapsedChrome={showDesktopCollapsedChrome}
          isResourceRoute={isResourceRoute}
          canGoBack={appNavigation.canGoBack}
          canGoForward={appNavigation.canGoForward}
          onGoBack={appNavigation.goBack}
          onGoForward={appNavigation.goForward}
          onToggleSidebar={handleSidebarToggle}
          leftSidebarCollapsed={sidebarCollapsed}
        />
      </SystemResizablePanelGroup>
    </div>
  );
}

export default AppLayout;
