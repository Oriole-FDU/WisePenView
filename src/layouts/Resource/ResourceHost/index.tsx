import { useRef } from 'react';
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
import { useChatPanelStore } from '@/components/business/ChatPanel/_store/useChatPanelStore';
import {
  CHAT_PANEL_MAX_WIDTH,
  CHAT_PANEL_MIN_WIDTH,
  clampChatPanelWidth,
  RESOURCE_MAIN_MIN_WIDTH,
} from '@/constants/layoutScale';
import { useOpenResource } from '@/hooks/useOpenResource';
import { useResizablePanelSize } from '@/hooks/useResizablePanelSize';
import { useAppNavigation } from '@/layouts/AppNavigation/AppNavigationContext';
import { useMainShell } from '@/layouts/MainShell/MainShellContext';
import { useResourceChatProtocolStore } from '@/layouts/Resource/_store/useResourceChatProtocolStore';
import { useResourceBreadcrumb } from '@/layouts/Resource/useResourceBreadcrumb';
import RouteOutletBoundary from '@/layouts/RouteOutletBoundary';
import { cn } from '@/utils/cn';
import { parseResourceDriveLocation } from '@/utils/navigation/resourceRoute';
import { normalizeResourceKind, resolveResourceViewer } from '@/utils/navigation/resourceTarget';
import {
  ResourceChatBindingProvider,
  ResourceChatPanel,
} from '@/views/resource/ResourceChatBinding';
import {
  DEFAULT_RESOURCE_HOST_ID,
  ResourceHostContext,
  type ResourceHostContextValue,
} from '@/views/resource/ResourceHostContext';

import styles from './style.module.less';

function ResourceHost() {
  const { t } = useTranslation('workspace');
  const { sidebarCollapsed, isMobileLayout, onToggleSidebar } = useMainShell();
  const appNavigation = useAppNavigation();
  const chatPanelRef = useRef<PanelImperativeHandle | null>(null);
  const pendingChatWidthRef = useRef<number | null>(null);
  const chatPanelCollapsed = useChatPanelStore((state) => state.chatPanelCollapsed);
  const chatPanelWidth = useChatPanelStore((state) => state.chatPanelWidth);
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
  const setChatPanelWidth = useChatPanelStore((state) => state.setChatPanelWidth);
  const clearResourceChatContext = useResourceChatProtocolStore((state) => state.clearContext);
  const resourceChatContext = useResourceChatProtocolStore((state) => state.context);
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
    setChatContext: useResourceChatProtocolStore.getState().setContext,
    clearChatContext: useResourceChatProtocolStore.getState().clearContext,
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
      <ResourceHostContext value={resourceHostContext}>
        <div className={cn(styles.shell, overlayChatOpen && styles.shellWithOverlay)}>
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
      </ResourceHostContext>
    </ResourceChatBindingProvider>
  );
}

export default ResourceHost;
