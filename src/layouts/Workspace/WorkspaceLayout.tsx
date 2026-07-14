import ChatPanel from '@/components/ChatPanel';
import { useChatPanelStore } from '@/components/ChatPanel/_store/useChatPanelStore';
import { useCurrentChatSessionStore } from '@/components/ChatPanel/_store/useCurrentChatSessionStore';
import { clearNewChatSessionStore } from '@/components/ChatPanel/_store/useNewChatSessionStore';
import { createResourceChatStateProvider } from '@/components/ChatPanel/ResourceChatProtocol';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import { useSystemLayoutStore } from '@/layouts/_common/_store/useSystemLayoutStore';
import DriveSidebar from '@/layouts/_common/Sidebar/DriveSidebar';
import {
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
} from '@/layouts/_common/SystemResizable';
import { useResizablePanelSize } from '@/layouts/_common/useResizablePanelSize';
import { useAppNavigation } from '@/layouts/AppNavigation/AppNavigationContext';
import { useEnterZenMode } from '@/layouts/ZenMode/useEnterZenMode';
import { normalizeResourceKind, resolveResourceViewer } from '@/utils/navigation/resourceTarget';
import {
  DEFAULT_RESOURCE_HOST_ID,
  ResourceHostContext,
  type ResourceHostContextValue,
  type ResourceHostLayoutConfig,
} from '@/views/workspace/ResourceHostContext';
import { useUpdateEffect } from 'ahooks';
import clsx from 'clsx';
import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  Layout,
  LayoutChangedMeta,
  PanelImperativeHandle,
  PanelSize,
} from 'react-resizable-panels';
import { Outlet, useLocation, useMatch } from 'react-router-dom';
import WorkspaceFrame from './_common/WorkspaceFrame';
import WorkspaceHeader from './_common/WorkspaceHeader';
import { useWorkspaceChatProtocolStore } from './_store/useWorkspaceChatProtocolStore';
import { useWorkspaceNavigationStore } from './_store/useWorkspaceNavigationStore';
import { useWorkspaceResourceBreadcrumb } from './useWorkspaceResourceBreadcrumb';
import styles from './WorkspaceLayout.module.less';

const WORKSPACE_LEFT_SIDEBAR_MIN_WIDTH = 240;
const WORKSPACE_LEFT_SIDEBAR_MAX_WIDTH = 420;
const WORKSPACE_MAIN_MIN_WIDTH = 360;
const CHAT_PANEL_MIN_WIDTH = 480;
const CHAT_PANEL_MAX_WIDTH = 1020;
const RESIZE_TARGET_MINIMUM_SIZE = { fine: 16, coarse: 32 };

const clampPanelWidth = (width: number, min: number, max: number): number =>
  Math.min(Math.max(Math.round(width), min), max);

const clampWorkspaceLeftSidebarWidth = (width: number): number =>
  clampPanelWidth(width, WORKSPACE_LEFT_SIDEBAR_MIN_WIDTH, WORKSPACE_LEFT_SIDEBAR_MAX_WIDTH);

function WorkspaceLayout() {
  const appNavigation = useAppNavigation();
  const openResource = useOpenInWorkspace();
  const enterZenMode = useEnterZenMode();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [layoutConfig, setLayoutConfigState] = useState<ResourceHostLayoutConfig>({});
  const storedLeftSidebarWidth = useSystemLayoutStore((state) => state.workspaceLeftSidebarWidth);
  const setLeftSidebarWidth = useSystemLayoutStore((state) => state.setWorkspaceLeftSidebarWidth);
  const leftSidebarPanelRef = useRef<PanelImperativeHandle | null>(null);
  const rightDockPanelRef = useRef<PanelImperativeHandle | null>(null);
  const pendingLeftSidebarWidthRef = useRef<number | null>(null);
  const pendingRightDockWidthRef = useRef<number | null>(null);
  const leftSidebarWidth = clampWorkspaceLeftSidebarWidth(storedLeftSidebarWidth);
  const chatPanelCollapsed = useChatPanelStore((state) => state.chatPanelCollapsed);
  const chatPanelDraftOpen = useChatPanelStore((state) => state.chatPanelDraftOpen);
  const chatPanelWidth = useChatPanelStore((state) => state.chatPanelWidth);
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
  const setChatPanelDraftOpen = useChatPanelStore((state) => state.setChatPanelDraftOpen);
  const setChatPanelWidth = useChatPanelStore((state) => state.setChatPanelWidth);
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const clearCurrentSession = useCurrentChatSessionStore((state) => state.clearCurrentSession);
  const workspaceChatContext = useWorkspaceChatProtocolStore((state) => state.context);
  const clearWorkspaceChatContext = useWorkspaceChatProtocolStore((state) => state.clearContext);
  const hasSessionId = Boolean(currentSessionId);
  const shouldRenderChatPanel = hasSessionId || chatPanelDraftOpen;
  const safeChatPanelCollapsed = !shouldRenderChatPanel || chatPanelCollapsed;
  const chatPanelOpen = !safeChatPanelCollapsed;
  const normalizedChatPanelWidth = clampPanelWidth(
    chatPanelWidth,
    CHAT_PANEL_MIN_WIDTH,
    CHAT_PANEL_MAX_WIDTH
  );
  const sidebarPanelSize = sidebarCollapsed ? 0 : leftSidebarWidth;
  const rightDockPanelSize = chatPanelOpen ? normalizedChatPanelWidth : 0;
  const location = useLocation();
  const resourceRouteMatch = useMatch('/app/workspace/:resourceType/:resourceId');
  const resourceListRouteMatch = useMatch('/app/workspace/:resourceType');
  const routeContext = useMemo(() => {
    const rawResourceType =
      resourceRouteMatch?.params.resourceType ?? resourceListRouteMatch?.params.resourceType;
    const resourceId = resourceRouteMatch?.params.resourceId;
    const resourceType = normalizeResourceKind(rawResourceType);
    const viewer = resolveResourceViewer({
      resourceType: rawResourceType,
      viewer: new URLSearchParams(location.search).get('viewer') ?? undefined,
    });

    return {
      resourceId,
      resourceType,
      viewer,
    };
  }, [
    location.search,
    resourceListRouteMatch?.params.resourceType,
    resourceRouteMatch?.params.resourceId,
    resourceRouteMatch?.params.resourceType,
  ]);
  const routeChatStateProvider = useMemo(() => {
    const { resourceId, resourceType, viewer } = routeContext;
    if (!resourceId || !resourceType) return undefined;
    return createResourceChatStateProvider({
      resourceId,
      resourceType,
      viewer,
    });
  }, [routeContext]);
  const resourceBreadcrumb = useWorkspaceResourceBreadcrumb(routeContext.resourceId);
  const workspaceChatStateProvider = layoutConfig.chatStateProvider ?? routeChatStateProvider;

  useResizablePanelSize({
    panelRef: leftSidebarPanelRef,
    size: sidebarPanelSize,
  });

  useResizablePanelSize({
    panelRef: rightDockPanelRef,
    size: rightDockPanelSize,
  });

  useUpdateEffect(() => {
    if (shouldRenderChatPanel) {
      setChatPanelCollapsed(false);
      return;
    }
    setChatPanelCollapsed(true);
  }, [setChatPanelCollapsed, shouldRenderChatPanel]);

  useUpdateEffect(() => {
    if (!hasSessionId && !chatPanelDraftOpen) return;
    if (hasSessionId) {
      setChatPanelDraftOpen(false);
    }
  }, [chatPanelDraftOpen, hasSessionId, setChatPanelDraftOpen]);

  useUpdateEffect(() => {
    if (!workspaceChatContext) return;
    if (!hasSessionId) {
      setChatPanelDraftOpen(true);
    }
    setChatPanelCollapsed(false);
  }, [hasSessionId, setChatPanelCollapsed, setChatPanelDraftOpen, workspaceChatContext]);

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed((collapsed) => {
      if (!collapsed) {
        const currentWidth = leftSidebarPanelRef.current?.getSize().inPixels;
        if (currentWidth != null) {
          const nextSidebarWidth = clampWorkspaceLeftSidebarWidth(currentWidth);
          if (
            nextSidebarWidth > WORKSPACE_LEFT_SIDEBAR_MIN_WIDTH ||
            leftSidebarWidth === WORKSPACE_LEFT_SIDEBAR_MIN_WIDTH
          ) {
            setLeftSidebarWidth(nextSidebarWidth);
          }
        }
      }
      return !collapsed;
    });
  }, [leftSidebarWidth, setLeftSidebarWidth]);

  const handleChatPanelToggle = useCallback(() => {
    if (safeChatPanelCollapsed) {
      if (!hasSessionId) {
        setChatPanelDraftOpen(true);
      }
      setChatPanelCollapsed(false);
      return;
    }

    setChatPanelCollapsed(true);
    if (!hasSessionId) {
      setChatPanelDraftOpen(false);
    }
  }, [hasSessionId, safeChatPanelCollapsed, setChatPanelCollapsed, setChatPanelDraftOpen]);

  const handleNewChat = useCallback(() => {
    clearCurrentSession();
    clearNewChatSessionStore();
    setChatPanelDraftOpen(true);
    setChatPanelCollapsed(false);
  }, [clearCurrentSession, setChatPanelCollapsed, setChatPanelDraftOpen]);

  const handleLeftSidebarResize = useCallback(
    (panelSize: PanelSize) => {
      if (sidebarCollapsed) return;
      pendingLeftSidebarWidthRef.current = clampWorkspaceLeftSidebarWidth(panelSize.inPixels);
    },
    [sidebarCollapsed]
  );

  const handleRightDockResize = useCallback(
    (panelSize: PanelSize) => {
      if (!chatPanelOpen) return;
      pendingRightDockWidthRef.current = clampPanelWidth(
        panelSize.inPixels,
        CHAT_PANEL_MIN_WIDTH,
        CHAT_PANEL_MAX_WIDTH
      );
    },
    [chatPanelOpen]
  );

  const handleWorkspaceShellLayoutChanged = useCallback(
    (_layout: Layout, meta: LayoutChangedMeta) => {
      const pendingLeftSidebarWidth = pendingLeftSidebarWidthRef.current;
      pendingLeftSidebarWidthRef.current = null;
      if (!meta.isUserInteraction) return;
      if (!sidebarCollapsed && pendingLeftSidebarWidth != null) {
        setLeftSidebarWidth(pendingLeftSidebarWidth);
      }
    },
    [setLeftSidebarWidth, sidebarCollapsed]
  );

  const handleWorkspaceContentLayoutChanged = useCallback(
    (_layout: Layout, meta: LayoutChangedMeta) => {
      const pendingRightDockWidth = pendingRightDockWidthRef.current;
      pendingRightDockWidthRef.current = null;
      if (!meta.isUserInteraction) return;
      if (chatPanelOpen && pendingRightDockWidth != null) {
        setChatPanelWidth(pendingRightDockWidth);
      }
    },
    [chatPanelOpen, setChatPanelWidth]
  );

  const setLayoutConfig = useCallback((config: ResourceHostLayoutConfig) => {
    setLayoutConfigState(config);
  }, []);

  const resetLayoutConfig = useCallback(() => {
    setLayoutConfigState({});
  }, []);

  const handleEnterZenMode = useCallback(() => {
    const { resourceId, resourceType, viewer } = routeContext;
    if (!resourceId || !resourceType) return;
    const resourceName =
      layoutConfig.header === false ? undefined : layoutConfig.header?.resource?.resourceName;
    enterZenMode(
      {
        resourceId,
        resourceType,
        resourceName,
        viewer,
      },
      useWorkspaceNavigationStore.getState().location
    );
  }, [enterZenMode, layoutConfig.header, routeContext]);

  const resourceHostContext = useMemo<ResourceHostContextValue>(
    () => ({
      hostId: DEFAULT_RESOURCE_HOST_ID,
      routeContext,
      getNavigationScope: () => useWorkspaceNavigationStore.getState().location.scope,
      openResource,
      setLayoutConfig,
      resetLayoutConfig,
      setChatContext: useWorkspaceChatProtocolStore.getState().setContext,
      clearChatContext: useWorkspaceChatProtocolStore.getState().clearContext,
    }),
    [openResource, resetLayoutConfig, routeContext, setLayoutConfig]
  );

  const renderHeader = () => {
    if (layoutConfig.header === false) return null;

    const headerConfig = layoutConfig.header ?? {};
    const resource = headerConfig.resource
      ? {
          ...headerConfig.resource,
          breadcrumbItems: resourceBreadcrumb.items,
          onBreadcrumbNavigate: resourceBreadcrumb.navigateToNode,
        }
      : undefined;

    return (
      <WorkspaceHeader
        {...headerConfig}
        resource={resource}
        canGoBack={appNavigation.canGoBack}
        canGoForward={appNavigation.canGoForward}
        leftSidebarCollapsed={sidebarCollapsed}
        rightSidebarCollapsed={safeChatPanelCollapsed}
        onGoBack={appNavigation.goBack}
        onGoForward={appNavigation.goForward}
        onToggleLeftSidebar={handleSidebarToggle}
        onToggleRightSidebar={handleChatPanelToggle}
        onEnterZenMode={handleEnterZenMode}
      />
    );
  };

  return (
    <SystemResizablePanelGroup
      orientation="horizontal"
      className={styles.root}
      resizeTargetMinimumSize={RESIZE_TARGET_MINIMUM_SIZE}
      onLayoutChanged={handleWorkspaceShellLayoutChanged}
    >
      <SystemResizablePanel
        id="workspace-left-sidebar"
        panelRef={leftSidebarPanelRef}
        defaultSize={sidebarPanelSize}
        minSize={sidebarCollapsed ? 0 : WORKSPACE_LEFT_SIDEBAR_MIN_WIDTH}
        maxSize={sidebarCollapsed ? 0 : WORKSPACE_LEFT_SIDEBAR_MAX_WIDTH}
        groupResizeBehavior="preserve-pixel-size"
        className={styles.leftSider}
        aria-label="资源侧边栏"
        aria-hidden={sidebarCollapsed ? true : undefined}
        onResize={handleLeftSidebarResize}
      >
        <DriveSidebar
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
        id="workspace-area"
        minSize={WORKSPACE_MAIN_MIN_WIDTH}
        className={styles.workspaceArea}
      >
        <SystemResizablePanelGroup
          orientation="horizontal"
          className={styles.workspaceInnerGroup}
          resizeTargetMinimumSize={RESIZE_TARGET_MINIMUM_SIZE}
          onLayoutChanged={handleWorkspaceContentLayoutChanged}
        >
          <SystemResizablePanel
            id="workspace-main"
            minSize={WORKSPACE_MAIN_MIN_WIDTH}
            className={styles.middleLayout}
          >
            <main className={`${styles.middleContent} ${styles.workspaceContent}`}>
              <ResourceHostContext value={resourceHostContext}>
                <WorkspaceFrame
                  className={layoutConfig.className}
                  bodyClassName={layoutConfig.bodyClassName}
                  header={renderHeader()}
                >
                  <Outlet />
                </WorkspaceFrame>
              </ResourceHostContext>
            </main>
          </SystemResizablePanel>

          <SystemResizableHandle
            className={clsx(styles.resizeHandle, !chatPanelOpen && styles.resizeHandleCollapsed)}
            disabled={!chatPanelOpen}
          />

          <SystemResizablePanel
            id="workspace-right-dock"
            panelRef={rightDockPanelRef}
            defaultSize={rightDockPanelSize}
            minSize={chatPanelOpen ? CHAT_PANEL_MIN_WIDTH : 0}
            maxSize={chatPanelOpen ? CHAT_PANEL_MAX_WIDTH : 0}
            groupResizeBehavior="preserve-pixel-size"
            className={styles.rightSider}
            aria-label="聊天面板"
            aria-hidden={!chatPanelOpen ? true : undefined}
            onResize={handleRightDockResize}
          >
            {chatPanelOpen ? (
              <ChatPanel
                collapsed={false}
                onNewChat={handleNewChat}
                resourceChat={{
                  provider: workspaceChatStateProvider,
                  context: workspaceChatContext,
                  clearContext: clearWorkspaceChatContext,
                }}
              />
            ) : null}
          </SystemResizablePanel>
        </SystemResizablePanelGroup>
      </SystemResizablePanel>
    </SystemResizablePanelGroup>
  );
}

export default WorkspaceLayout;
