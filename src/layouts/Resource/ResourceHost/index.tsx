import { clsx } from 'clsx';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  Layout,
  LayoutChangedMeta,
  PanelImperativeHandle,
  PanelSize,
} from 'react-resizable-panels';
import { Outlet, useLocation, useParams } from 'react-router-dom';

import {
  RESIZE_TARGET_MINIMUM_SIZE,
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
} from '@/components/base/SystemResizable';
import {
  CHAT_PANEL_MAX_WIDTH,
  CHAT_PANEL_MIN_WIDTH,
  clampChatPanelWidth,
  RESOURCE_MAIN_MIN_WIDTH,
} from '@/constants/layoutScale';
import {
  normalizeResourceKind,
  resolveResourceViewer,
} from '@/domains/Resource/model/resourceTarget';
import { clearFrontendStates, FRONTEND_STATE_SOURCE, setFrontendStates } from '@/frontendState';
import { useOpenResource } from '@/hooks/useOpenResource';
import { useResizablePanelSize } from '@/hooks/useResizablePanelSize';
import { useAppNavigation } from '@/layouts/AppNavigation/_context';
import { useMainShell } from '@/layouts/MainShell/_context';
import { useChatDockLayoutStore } from '@/layouts/MainShell/_store/useChatDockLayoutStore';
import {
  buildResourceOpenState,
  type ResourceChatContext,
} from '@/layouts/Resource/_context/resourceChatModel';
import { useResourceChatContextStore } from '@/layouts/Resource/_store/useResourceChatContextStore';
import { useResourceBreadcrumb } from '@/layouts/Resource/useResourceBreadcrumb';
import RouteOutletBoundary from '@/layouts/RouteOutletBoundary';
import { parseResourceDriveLocation } from '@/utils/navigation/resourceRoute';

import {
  DEFAULT_RESOURCE_HOST_ID,
  ResourceChatBindingProvider,
  ResourceChatPanel,
  type ResourceHostContextValue,
  ResourceHostProvider,
} from '../_context';
import styles from './style.module.less';

function ResourceHost() {
  const { t } = useTranslation('workspace');
  const { sidebarCollapsed, isMobileLayout, onToggleSidebar } = useMainShell();
  const appNavigation = useAppNavigation();
  const chatPanelRef = useRef<PanelImperativeHandle | null>(null);
  const pendingChatWidthRef = useRef<number | null>(null);
  const chatPanelCollapsed = useChatDockLayoutStore((state) => state.chatPanelCollapsed);
  const chatPanelWidth = useChatDockLayoutStore((state) => state.chatPanelWidth);
  const setChatPanelCollapsed = useChatDockLayoutStore((state) => state.setChatPanelCollapsed);
  const setChatPanelWidth = useChatDockLayoutStore((state) => state.setChatPanelWidth);
  const resourceChatContext = useResourceChatContextStore((state) => state.context);
  const clearResourceChatContext = (context?: ResourceChatContext) => {
    const current = useResourceChatContextStore.getState().context;
    if (context && current !== context) return;
    useResourceChatContextStore.getState().clearContext(context);
    clearFrontendStates({ source: FRONTEND_STATE_SOURCE.SELECTION });
  };
  /**
   * @wisepen-manual-effect
   * 执行时机：资源宿主离开页面时结束未发送的选区。
   * 不可替代原因：共享状态按标签存在，资源宿主卸载不会自动清理它。
   * cleanup：移除当前宿主的选区和匹配信息。
   */
  useEffect(
    () => () => {
      useResourceChatContextStore.getState().clearContext();
      clearFrontendStates({ source: FRONTEND_STATE_SOURCE.SELECTION });
    },
    []
  );
  const openResource = useOpenResource();
  const location = useLocation();
  const resourceRouteParams = useParams<{ resourceType?: string; resourceId?: string }>();
  const routeContext = (() => {
    const rawResourceType = resourceRouteParams.resourceType;
    const resourceId = resourceRouteParams.resourceId;
    const resourceType = normalizeResourceKind(rawResourceType);
    const viewer = resolveResourceViewer({
      resourceType: rawResourceType,
      viewer: new URLSearchParams(location.search).get('viewer') ?? undefined,
    });

    return {
      resourceId,
      resourceType,
      viewer,
      driveLocation: parseResourceDriveLocation(new URLSearchParams(location.search)),
    };
  })();
  const { resourceId, resourceType, viewer } = routeContext;
  /**
   * @wisepen-manual-effect
   * 执行时机：资源路由变化时更新当前面板的打开资源。
   * 不可替代原因：资源页和聊天面板可分别挂载，发送读取必须使用当前路由。
   * cleanup：仅清理本次写入，避免旧资源卸载覆盖新资源。
   */
  useEffect(() => {
    if (!resourceId || !resourceType) {
      clearFrontendStates({ source: FRONTEND_STATE_SOURCE.RESOURCE });
      return;
    }
    const revision = setFrontendStates({
      source: FRONTEND_STATE_SOURCE.RESOURCE,
      resourceId,
      entries: [buildResourceOpenState({ resourceId, resourceType, viewer })],
    });
    return () =>
      clearFrontendStates({
        source: FRONTEND_STATE_SOURCE.RESOURCE,
        revision,
      });
  }, [resourceId, resourceType, viewer]);
  const resourceBreadcrumbItems = useResourceBreadcrumb(
    routeContext.resourceId,
    routeContext.driveLocation
  );
  const chatPanelOpen = !chatPanelCollapsed;
  const dockChatOpen = chatPanelOpen && !isMobileLayout;
  const overlayChatOpen = chatPanelOpen && isMobileLayout;
  const chatPanelSize = dockChatOpen ? clampChatPanelWidth(chatPanelWidth) : 0;

  useResizablePanelSize({ panelRef: chatPanelRef, size: chatPanelSize });

  const resourceHostContext = {
    hostId: DEFAULT_RESOURCE_HOST_ID,
    routeContext,
    openResource,
    headerNavigation: {
      leftSidebarCollapsed: sidebarCollapsed,
      canGoBack: appNavigation.canGoBack,
      canGoForward: appNavigation.canGoForward,
      onGoBack: appNavigation.goBack,
      onGoForward: appNavigation.goForward,
      onToggleLeftSidebar: onToggleSidebar,
    },
    breadcrumbItems: resourceBreadcrumbItems,
    chatPanelCollapsed,
    toggleChatPanel: () => setChatPanelCollapsed(!chatPanelCollapsed),
    openChatPanel: () => setChatPanelCollapsed(false),
    setChatContext: useResourceChatContextStore.getState().setContext,
    clearChatContext: clearResourceChatContext,
  } satisfies ResourceHostContextValue;

  const chatPanel = (
    <ResourceChatPanel
      target={routeContext}
      showCollapseButton={isMobileLayout}
      context={resourceChatContext}
      clearContext={clearResourceChatContext}
    />
  );

  const handleChatResize = (size: PanelSize) => {
    if (dockChatOpen) {
      pendingChatWidthRef.current = clampChatPanelWidth(size.inPixels);
    }
  };

  const handleLayoutChanged = (_layout: Layout, meta: LayoutChangedMeta) => {
    const pendingChatWidth = pendingChatWidthRef.current;
    pendingChatWidthRef.current = null;
    if (meta.isUserInteraction && dockChatOpen && pendingChatWidth != null) {
      setChatPanelWidth(pendingChatWidth);
    }
  };

  return (
    <ResourceChatBindingProvider>
      <ResourceHostProvider value={resourceHostContext}>
        <div className={clsx(styles.shell, overlayChatOpen && styles.shellWithOverlay)}>
          <SystemResizablePanelGroup
            orientation="horizontal"
            className={styles.root}
            resizeTargetMinimumSize={RESIZE_TARGET_MINIMUM_SIZE}
            onLayoutChanged={handleLayoutChanged}
          >
            <SystemResizablePanel
              minSize={isMobileLayout ? 0 : RESOURCE_MAIN_MIN_WIDTH}
              className={styles.resourcePanel}
            >
              <RouteOutletBoundary>
                <Outlet />
              </RouteOutletBoundary>
            </SystemResizablePanel>

            {!isMobileLayout ? (
              <>
                <SystemResizableHandle
                  collapsed={!dockChatOpen}
                  disabled={!dockChatOpen}
                  aria-label={t('shell.resizeChatPanel')}
                />
                <SystemResizablePanel
                  id="app-resource-chat"
                  panelRef={chatPanelRef}
                  defaultSize={chatPanelSize}
                  minSize={dockChatOpen ? CHAT_PANEL_MIN_WIDTH : 0}
                  maxSize={dockChatOpen ? CHAT_PANEL_MAX_WIDTH : 0}
                  groupResizeBehavior="preserve-pixel-size"
                  className={styles.chatDock}
                  aria-label={t('shell.chatPanel')}
                  aria-hidden={!dockChatOpen ? true : undefined}
                  onResize={handleChatResize}
                >
                  {dockChatOpen ? chatPanel : null}
                </SystemResizablePanel>
              </>
            ) : null}
          </SystemResizablePanelGroup>

          {overlayChatOpen ? (
            <div
              className={styles.chatOverlay}
              role="dialog"
              aria-modal="true"
              aria-label={t('shell.chatPanel')}
            >
              {chatPanel}
            </div>
          ) : null}
        </div>
      </ResourceHostProvider>
    </ResourceChatBindingProvider>
  );
}

export default ResourceHost;
