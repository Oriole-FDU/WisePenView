import { Drawer } from '@heroui/react';
import { Menu } from 'lucide-react';
import { type CSSProperties, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import AppIconButton from '@/components/base/Button/AppIconButton';
import {
  RESIZE_TARGET_MINIMUM_SIZE,
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
} from '@/components/base/SystemResizable';
import { MAIN_SIDEBAR_RAIL_WIDTH } from '@/constants/layoutScale';
import { SIDEBAR_TOGGLE_BUTTON_PROPS } from '@/constants/sidebarToggle';
import { useDesktopWindowState } from '@/hooks/useDesktopWindowState';
import { cn } from '@/utils/cn';

import { MainShellContext, type MainShellContextValue } from './MainShellContext';
import SkipToMainLink, { MAIN_CONTENT_ID } from './SkipToMainLink';
import styles from './style.module.less';
import { useMainShellMobileSnapshot } from './useMainShellMobile';
import { SIDEBAR_COLLAPSE_DURATION_MS, SIDEBAR_COLLAPSE_EASING } from './useSidebarCollapseMotion';
import { useSystemSidebarPanel } from './useSystemSidebarPanel';

interface MainSidebarRenderState {
  onToggle: () => void;
  collapsed: boolean;
  motionPhase: 'expanded' | 'collapsing' | 'collapsed' | 'expanding';
}

interface MainDrawerSidebarRenderState {
  /** 窄屏侧栏项被选中后关闭 Drawer */
  onNavigate: () => void;
}

interface MainShellProps {
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

interface DrawerOpenState {
  breakpointVersion: number;
  routeKey: string;
}

/**
 * 主壳：桌面端侧栏面板 + 主内容，窄屏顶栏 + 侧栏 Drawer。
 * 应用端与管理端布局都基于它构建，窄屏行为与主内容框架由壳统一提供，
 * 侧栏具体内容和窄态呈现由侧栏组件自己维护。
 */
function MainShell({
  panelGroupId,
  sidebarAriaLabel,
  mainMinWidth,
  mainContentScroll = false,
  renderSidebar,
  renderDrawerSidebar,
  mobileHeaderTitle,
  children,
}: MainShellProps) {
  const { t } = useTranslation('shell');
  const desktopWindow = useDesktopWindowState();
  const location = useLocation();
  const { breakpointVersion, isMobileLayout } = useMainShellMobileSnapshot();
  const sidebar = useSystemSidebarPanel({
    collapsedWidth: MAIN_SIDEBAR_RAIL_WIDTH,
    enabled: !isMobileLayout,
  });
  const [drawerOpenState, setDrawerOpenState] = useState<DrawerOpenState | null>(null);
  const drawerOpen =
    isMobileLayout &&
    drawerOpenState?.routeKey === location.key &&
    drawerOpenState.breakpointVersion === breakpointVersion;

  const setDrawerOpen = (open: boolean) => {
    setDrawerOpenState(open ? { breakpointVersion, routeKey: location.key } : null);
  };

  const toggleSidebar = () => {
    if (isMobileLayout) {
      setDrawerOpenState((openState) =>
        openState?.routeKey === location.key && openState.breakpointVersion === breakpointVersion
          ? null
          : { breakpointVersion, routeKey: location.key }
      );
      return;
    }
    sidebar.toggle();
  };

  const mainShellContext = {
    sidebarCollapsed: sidebar.collapsed,
    isMobileLayout,
    onToggleSidebar: toggleSidebar,
  } satisfies MainShellContextValue;
  const motionStyle = {
    '--main-sidebar-motion-duration': `${SIDEBAR_COLLAPSE_DURATION_MS}ms`,
    '--main-sidebar-motion-ease': SIDEBAR_COLLAPSE_EASING,
    '--main-sidebar-motion-fade-duration': '160ms',
    '--main-sidebar-motion-reveal-delay': `${Math.round(SIDEBAR_COLLAPSE_DURATION_MS * 0.65)}ms`,
    '--main-sidebar-motion-collapse-delay': `${SIDEBAR_COLLAPSE_DURATION_MS / 4}ms`,
  } as CSSProperties;

  const mainColumn = (
    <div
      className={cn(
        styles.mainColumn,
        desktopWindow.hasTitleBarInset &&
          desktopWindow.titleBarInsetSide === 'end' &&
          styles.titleBarInsetEnd
      )}
    >
      {isMobileLayout && mobileHeaderTitle ? (
        <header className={styles.mobileHeader}>
          <AppIconButton
            icon={<Menu size={20} aria-hidden="true" />}
            label={t('navigation.expandSidebar')}
            isActive={drawerOpen}
            onPress={() => setDrawerOpen(true)}
            {...SIDEBAR_TOGGLE_BUTTON_PROPS}
          />
          {mobileHeaderTitle}
        </header>
      ) : null}
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className={cn(styles.mainContent, mainContentScroll && styles.mainContentScroll)}
      >
        {children}
      </main>
    </div>
  );

  return (
    <MainShellContext value={mainShellContext}>
      <div
        className={cn(
          styles.root,
          sidebar.motionPhase === 'collapsed' && styles.rootCollapsed,
          isMobileLayout && styles.rootMobile
        )}
        data-main-sidebar-collapsed={sidebar.motionPhase === 'collapsed' || undefined}
        data-main-sidebar-motion-phase={sidebar.motionPhase}
        style={motionStyle}
      >
        <SkipToMainLink />
        {isMobileLayout ? (
          <>
            {mainColumn}
            {/* 侧栏由外部按钮控制，直接控制 Backdrop，避免创建没有触发器的 PressResponder。 */}
            <Drawer.Backdrop
              className={styles.drawerBackdrop}
              isDismissable
              isOpen={drawerOpen}
              onOpenChange={setDrawerOpen}
            >
              <Drawer.Content placement="left" className={styles.drawerContent}>
                <Drawer.Dialog className={styles.drawerDialog} aria-label={sidebarAriaLabel}>
                  <Drawer.Body className={styles.drawerBody}>
                    {renderDrawerSidebar({ onNavigate: () => setDrawerOpen(false) })}
                  </Drawer.Body>
                </Drawer.Dialog>
              </Drawer.Content>
            </Drawer.Backdrop>
          </>
        ) : (
          <SystemResizablePanelGroup
            id={panelGroupId}
            orientation="horizontal"
            className={styles.panelGroup}
            resizeTargetMinimumSize={RESIZE_TARGET_MINIMUM_SIZE}
            onLayoutChanged={sidebar.handleLayoutChanged}
          >
            <SystemResizablePanel
              id={`${panelGroupId}-sidebar`}
              panelRef={sidebar.panelRef}
              defaultSize={sidebar.panelSize}
              minSize={sidebar.minSize}
              maxSize={sidebar.maxSize}
              groupResizeBehavior="preserve-pixel-size"
              className={styles.sidebarPanel}
              aria-label={sidebarAriaLabel}
              onResize={sidebar.handleResize}
            >
              {renderSidebar({
                onToggle: toggleSidebar,
                collapsed: sidebar.motionPhase === 'collapsed',
                motionPhase: sidebar.motionPhase,
              })}
            </SystemResizablePanel>

            <SystemResizableHandle
              collapsed={sidebar.collapsed}
              disabled={sidebar.collapsed}
              aria-label={t('navigation.resizeSidebar')}
            />

            <SystemResizablePanel
              id={`${panelGroupId}-main`}
              minSize={mainMinWidth}
              className={styles.mainColumnPanel}
            >
              {mainColumn}
            </SystemResizablePanel>
          </SystemResizablePanelGroup>
        )}
      </div>
    </MainShellContext>
  );
}

export default MainShell;
