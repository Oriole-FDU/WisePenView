import ChatPanel from '@/components/ChatPanel';
import { useChatPanelStore } from '@/components/ChatPanel/_store/useChatPanelStore';
import { useCurrentChatSessionStore } from '@/components/ChatPanel/_store/useCurrentChatSessionStore';
import { clearNewChatSessionStore } from '@/components/ChatPanel/_store/useNewChatSessionStore';
import { createResourceChatStateProvider } from '@/components/ChatPanel/ResourceChatProtocol';
import {
  CHAT_PANEL_MIN_WIDTH,
  clampWorkspaceChatPanelWidth,
  LAYOUT_DENSITY,
  MAIN_MIN_WIDTH,
  MAIN_SCROLL_MIN_WIDTH,
  NOTE_EDITOR_MIN_WIDTH,
  resolveLayoutDensity,
  WORKSPACE_CHAT_PANEL_MAX_WIDTH,
} from '@/constants/layoutScale';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
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
import { useCompactChatCollapse } from '@/layouts/_common/useCompactChatCollapse';
import { useCompactSidebarCollapse } from '@/layouts/_common/useCompactSidebarCollapse';
import { useResizablePanelSize } from '@/layouts/_common/useResizablePanelSize';
import { useAppNavigation } from '@/layouts/AppNavigation/AppNavigationContext';
import { useEnterZenMode } from '@/layouts/ZenMode/useEnterZenMode';
import { normalizeResourceKind, resolveResourceViewer } from '@/utils/navigation/resourceTarget';
import WorkspaceResourceSidePanelActions from '@/views/workspace/_components/WorkspaceResourceSidePanel/Actions';
import { useWorkspaceResourceSidePanelStore } from '@/views/workspace/_store/useWorkspaceResourceSidePanelStore';
import {
  DEFAULT_RESOURCE_HOST_ID,
  ResourceHostContext,
  type ResourceHostContextValue,
  type ResourceHostLayoutConfig,
} from '@/views/workspace/ResourceHostContext';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

const RESIZE_TARGET_MINIMUM_SIZE = { fine: 16, coarse: 32 };

const WORKSPACE_MAIN_WITH_CHAT_MIN_WIDTH = NOTE_EDITOR_MIN_WIDTH;

const closeOpenResourceSidePanels = (): void => {
  const { modeByResourceId, setMode } = useWorkspaceResourceSidePanelStore.getState();
  for (const [resourceId, mode] of Object.entries(modeByResourceId)) {
    if (mode !== 'closed') {
      setMode(resourceId, 'closed');
    }
  }
};

function WorkspaceLayout() {
  const { t } = useTranslation('workspace');
  const appNavigation = useAppNavigation();
  const openResource = useOpenInWorkspace();
  const enterZenMode = useEnterZenMode();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () =>
      typeof window !== 'undefined' &&
      resolveLayoutDensity(window.innerWidth) === LAYOUT_DENSITY.COMPACT
  );
  const [layoutConfig, setLayoutConfigState] = useState<ResourceHostLayoutConfig>({});
  const storedLeftSidebarWidth = useSystemLayoutStore((state) => state.appSidebarWidth);
  const setLeftSidebarWidth = useSystemLayoutStore((state) => state.setAppSidebarWidth);
  const leftSidebarPanelRef = useRef<PanelImperativeHandle | null>(null);
  const rightDockPanelRef = useRef<PanelImperativeHandle | null>(null);
  const pendingLeftSidebarWidthRef = useRef<number | null>(null);
  const pendingRightDockWidthRef = useRef<number | null>(null);
  const leftSidebarWidth = clampSidebarWidth(storedLeftSidebarWidth);
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
  const normalizedChatPanelWidth = clampWorkspaceChatPanelWidth(chatPanelWidth);
  const sidebarPanelSize = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : leftSidebarWidth;
  const rightDockPanelSize = chatPanelOpen ? normalizedChatPanelWidth : 0;
  const location = useLocation();
  const resourceRouteMatch = useMatch('/app/workspace/:resourceType/:resourceId');
  const resourceListRouteMatch = useMatch('/app/workspace/:resourceType');
  const routeContext = (() => {
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
  })();
  const routeChatStateProvider = (() => {
    const { resourceId, resourceType, viewer } = routeContext;
    if (!resourceId || !resourceType) return undefined;
    return createResourceChatStateProvider({
      resourceId,
      resourceType,
      viewer,
    });
  })();
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

  /**
   * @wisepen-manual-effect
   * 执行时机：会话或聊天草稿决定面板是否存在时，同步聊天面板折叠 store。
   * 不可替代原因：会话、草稿和折叠状态分属独立 Zustand store，且窄屏判断依赖浏览器宽度。
   * cleanup：没有订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    if (!shouldRenderChatPanel) {
      setChatPanelCollapsed(true);
      return;
    }
    // 窄屏默认收起，由密度 hook / 用户按钮决定是否展开，避免一进来就遮盖主区
    if (resolveLayoutDensity(window.innerWidth) === LAYOUT_DENSITY.COMPACT) {
      setChatPanelCollapsed(true);
      return;
    }
    setChatPanelCollapsed(false);
  }, [setChatPanelCollapsed, shouldRenderChatPanel]);

  /**
   * @wisepen-manual-effect
   * 执行时机：真实会话建立后关闭仅用于新会话入口的草稿面板标记。
   * 不可替代原因：当前会话与聊天面板状态分属独立 Zustand store。
   * cleanup：没有订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    if (!hasSessionId && !chatPanelDraftOpen) return;
    if (hasSessionId) {
      setChatPanelDraftOpen(false);
    }
  }, [chatPanelDraftOpen, hasSessionId, setChatPanelDraftOpen]);

  const persistLeftSidebarWidthFromPanel = () => {
    const currentWidth = leftSidebarPanelRef.current?.getSize().inPixels;
    if (currentWidth == null) return;
    const nextSidebarWidth = clampSidebarWidth(currentWidth);
    if (nextSidebarWidth > SIDEBAR_MIN_WIDTH || leftSidebarWidth === SIDEBAR_MIN_WIDTH) {
      setLeftSidebarWidth(nextSidebarWidth);
    }
  };

  const { density, markSidebarUserOverride } = useCompactSidebarCollapse({
    sidebarCollapsed,
    setSidebarCollapsed,
    onAutoCollapse: persistLeftSidebarWidthFromPanel,
  });

  const { markChatUserOverride } = useCompactChatCollapse({
    density,
    shouldRenderChatPanel,
    chatPanelCollapsed,
    setChatPanelCollapsed,
  });

  /**
   * @wisepen-manual-effect
   * 执行时机：资源页向工作区 Chat 发布上下文后，展开面板并处理窄屏冲突。
   * 不可替代原因：资源上下文、聊天面板和资源侧栏是多个独立外部 store。
   * cleanup：没有订阅或延迟任务；上下文由消费方显式清除。
   */
  useEffect(() => {
    if (!workspaceChatContext) return;
    markChatUserOverride();
    if (density === LAYOUT_DENSITY.COMPACT) {
      closeOpenResourceSidePanels();
    }
    if (!hasSessionId) {
      setChatPanelDraftOpen(true);
    }
    setChatPanelCollapsed(false);
  }, [
    density,
    hasSessionId,
    markChatUserOverride,
    setChatPanelCollapsed,
    setChatPanelDraftOpen,
    workspaceChatContext,
  ]);

  const handleSidebarToggle = () => {
    markSidebarUserOverride();
    setSidebarCollapsed((collapsed) => {
      if (!collapsed) {
        persistLeftSidebarWidthFromPanel();
      }
      return !collapsed;
    });
  };

  const handleChatPanelToggle = () => {
    if (safeChatPanelCollapsed) {
      markChatUserOverride();
      if (density === LAYOUT_DENSITY.COMPACT) {
        // 窄屏下唤出 Chat 时先关掉资源评论/批注栏，避免三栏叠压遮盖
        closeOpenResourceSidePanels();
      }
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
  };

  const handleNewChat = () => {
    markChatUserOverride();
    if (density === LAYOUT_DENSITY.COMPACT) {
      closeOpenResourceSidePanels();
    }
    clearCurrentSession();
    clearNewChatSessionStore();
    setChatPanelDraftOpen(true);
    setChatPanelCollapsed(false);
  };

  const handleLeftSidebarResize = (panelSize: PanelSize) => {
    if (sidebarCollapsed) return;
    pendingLeftSidebarWidthRef.current = clampSidebarWidth(panelSize.inPixels);
  };

  const handleRightDockResize = (panelSize: PanelSize) => {
    if (!chatPanelOpen) return;
    pendingRightDockWidthRef.current = clampWorkspaceChatPanelWidth(panelSize.inPixels);
  };

  const handleWorkspaceShellLayoutChanged = (_layout: Layout, meta: LayoutChangedMeta) => {
    const pendingLeftSidebarWidth = pendingLeftSidebarWidthRef.current;
    pendingLeftSidebarWidthRef.current = null;
    if (!meta.isUserInteraction) return;
    if (!sidebarCollapsed && pendingLeftSidebarWidth != null) {
      setLeftSidebarWidth(pendingLeftSidebarWidth);
    }
  };

  const handleWorkspaceContentLayoutChanged = (_layout: Layout, meta: LayoutChangedMeta) => {
    const pendingRightDockWidth = pendingRightDockWidthRef.current;
    pendingRightDockWidthRef.current = null;
    if (!meta.isUserInteraction) return;
    if (chatPanelOpen && pendingRightDockWidth != null) {
      setChatPanelWidth(pendingRightDockWidth);
    }
  };

  const resetLayoutConfig = () => {
    setLayoutConfigState({});
  };

  const handleEnterZenMode = () => {
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
  };

  const resourceHostContext = {
    hostId: DEFAULT_RESOURCE_HOST_ID,
    layoutConfig,
    routeContext,
    getNavigationScope: () => useWorkspaceNavigationStore.getState().location.scope,
    openResource,
    setLayoutConfig: setLayoutConfigState,
    resetLayoutConfig,
    setChatContext: useWorkspaceChatProtocolStore.getState().setContext,
    clearChatContext: useWorkspaceChatProtocolStore.getState().clearContext,
  } satisfies ResourceHostContextValue;

  const renderHeader = () => {
    if (layoutConfig.header === false) return null;

    const headerConfig = layoutConfig.header ?? {};
    const sidePanelConfig =
      layoutConfig.sidePanel?.resource.resourceId === routeContext.resourceId
        ? layoutConfig.sidePanel
        : undefined;
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
        resourceSidePanelActions={
          sidePanelConfig ? (
            <WorkspaceResourceSidePanelActions
              resourceId={sidePanelConfig.resource.resourceId}
              inlineCommentAvailable={Boolean(sidePanelConfig.inlineComment)}
              disabled={headerConfig.resource?.isDisabled}
            />
          ) : undefined
        }
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
      data-layout-density={density}
      resizeTargetMinimumSize={RESIZE_TARGET_MINIMUM_SIZE}
      onLayoutChanged={handleWorkspaceShellLayoutChanged}
    >
      <SystemResizablePanel
        id="workspace-left-sidebar"
        panelRef={leftSidebarPanelRef}
        defaultSize={sidebarPanelSize}
        minSize={sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_MIN_WIDTH}
        maxSize={sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_MAX_WIDTH}
        groupResizeBehavior="preserve-pixel-size"
        className={styles.leftSider}
        aria-label={t('shell.appSidebar')}
        aria-hidden={sidebarCollapsed ? true : undefined}
        onResize={handleLeftSidebarResize}
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
        id="workspace-area"
        /* 外层只占侧栏剩余空间；主区+Chat 的下限由内层 Panel 约束，避免双重叠加撑破 */
        minSize={MAIN_SCROLL_MIN_WIDTH}
        className={styles.workspaceArea}
      >
        <SystemResizablePanelGroup
          orientation="horizontal"
          className={clsx(
            styles.workspaceInnerGroup,
            chatPanelOpen && styles.workspaceInnerGroupChatOpen
          )}
          resizeTargetMinimumSize={RESIZE_TARGET_MINIMUM_SIZE}
          onLayoutChanged={handleWorkspaceContentLayoutChanged}
        >
          <SystemResizablePanel
            id="workspace-main"
            minSize={chatPanelOpen ? WORKSPACE_MAIN_WITH_CHAT_MIN_WIDTH : MAIN_MIN_WIDTH}
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
            maxSize={chatPanelOpen ? WORKSPACE_CHAT_PANEL_MAX_WIDTH : 0}
            groupResizeBehavior="preserve-pixel-size"
            className={styles.rightSider}
            aria-label={t('shell.chatPanel')}
            aria-hidden={!chatPanelOpen ? true : undefined}
            onResize={handleRightDockResize}
          >
            {chatPanelOpen ? (
              <ChatPanel
                onNewChat={handleNewChat}
                resourceChat={{
                  provider: workspaceChatStateProvider,
                  context: workspaceChatContext,
                  clearContext: clearWorkspaceChatContext,
                }}
                agentDebug={layoutConfig.chatAgentDebug}
              />
            ) : null}
          </SystemResizablePanel>
        </SystemResizablePanelGroup>
      </SystemResizablePanel>
    </SystemResizablePanelGroup>
  );
}

export default WorkspaceLayout;
