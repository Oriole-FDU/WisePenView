import ChatPanel from '@/components/ChatPanel';
import { useChatPanelStore } from '@/components/ChatPanel/_store/useChatPanelStore';
import { createResourceChatStateProvider } from '@/components/ChatPanel/ResourceChatProtocol';
import {
  CHAT_PANEL_MAX_WIDTH,
  CHAT_PANEL_MIN_WIDTH,
  LAYOUT_DENSITY,
  RESOURCE_MAIN_MIN_WIDTH,
  clampChatPanelWidth,
} from '@/constants/layoutScale';
import { useOpenResource } from '@/hooks/useOpenResource';
import {
  RESIZE_TARGET_MINIMUM_SIZE,
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
} from '@/layouts/_common/SystemResizable';
import { useResizablePanelSize } from '@/layouts/_common/useResizablePanelSize';
import { useViewportLayoutScale } from '@/layouts/_common/useViewportLayoutScale';
import { useResourceChatProtocolStore } from '@/layouts/Resource/_store/useResourceChatProtocolStore';
import ResourceFrame from '@/layouts/Resource/ResourceFrame';
import ResourceShellHeader from '@/layouts/Resource/ResourceShellHeader';
import { useResourceBreadcrumb } from '@/layouts/Resource/useResourceBreadcrumb';
import { useResourceHeaderEndReserve } from '@/layouts/Resource/useResourceHeaderEndReserve';
import { cn } from '@/utils/cn';
import { parseResourceDriveLocation } from '@/utils/navigation/resourceRoute';
import { normalizeResourceKind, resolveResourceViewer } from '@/utils/navigation/resourceTarget';
import ResourceSidePanelActions from '@/views/resource/_components/ResourceSidePanel/Actions';
import {
  DEFAULT_RESOURCE_HOST_ID,
  ResourceHostContext,
  type ResourceHostContextValue,
  type ResourceHostLayoutConfig,
} from '@/views/resource/ResourceHostContext';
import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  Layout,
  LayoutChangedMeta,
  PanelImperativeHandle,
  PanelSize,
} from 'react-resizable-panels';
import { useLocation, useParams } from 'react-router-dom';
import styles from './AppResourceShell.module.less';

interface AppResourceShellProps {
  children: ReactNode;
  leftSidebarCollapsed: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onToggleLeftSidebar: () => void;
}

function AppResourceShell({
  children,
  leftSidebarCollapsed,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onToggleLeftSidebar,
}: AppResourceShellProps) {
  const { t } = useTranslation('workspace');
  const [layoutConfig, setLayoutConfigState] = useState<ResourceHostLayoutConfig>({});
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
  // 与侧栏 compact 同源：窄屏改为全屏 overlay，避免并排抢 Chat min-width。
  const { widthDensity } = useViewportLayoutScale();
  const isCompactChat = widthDensity === LAYOUT_DENSITY.COMPACT;
  const { headerRef } = useResourceHeaderEndReserve({
    idleDockWidthPx: 0,
    isAnimating: false,
  });
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
  const dockChatOpen = chatPanelOpen && !isCompactChat;
  const overlayChatOpen = chatPanelOpen && isCompactChat;
  const chatPanelSize = dockChatOpen ? clampChatPanelWidth(chatPanelWidth) : 0;

  useResizablePanelSize({ panelRef: chatPanelRef, size: chatPanelSize });

  const resetLayoutConfig = () => {
    setLayoutConfigState({});
  };

  const resourceHostContext = {
    hostId: DEFAULT_RESOURCE_HOST_ID,
    layoutConfig,
    routeContext,
    openResource,
    setLayoutConfig: setLayoutConfigState,
    resetLayoutConfig,
    openChatPanel: () => setChatPanelCollapsed(false),
    setChatContext: useResourceChatProtocolStore.getState().setContext,
    clearChatContext: useResourceChatProtocolStore.getState().clearContext,
  } satisfies ResourceHostContextValue;

  const renderHeader = () => {
    if (layoutConfig.header === false) {
      return leftSidebarCollapsed ? (
        <ResourceShellHeader
          leftSidebarCollapsed
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onGoBack={onGoBack}
          onGoForward={onGoForward}
          onToggleLeftSidebar={onToggleLeftSidebar}
          headerRef={headerRef}
        />
      ) : null;
    }

    const headerConfig = layoutConfig.header ?? {};
    const sidePanelConfig =
      layoutConfig.sidePanel?.resource.resourceId === routeContext.resourceId
        ? layoutConfig.sidePanel
        : undefined;
    const resource = headerConfig.resource
      ? {
          ...headerConfig.resource,
          breadcrumbItems: resourceBreadcrumbItems,
          chatPanelCollapsed,
          onToggleChatPanel: () => setChatPanelCollapsed(!chatPanelCollapsed),
        }
      : undefined;

    return (
      <ResourceShellHeader
        {...headerConfig}
        resource={resource}
        resourceSidePanelActions={
          sidePanelConfig ? (
            <ResourceSidePanelActions
              resourceId={sidePanelConfig.resource.resourceId}
              inlineCommentAvailable={Boolean(sidePanelConfig.inlineComment)}
              disabled={headerConfig.resource?.isDisabled}
            />
          ) : undefined
        }
        leftSidebarCollapsed={leftSidebarCollapsed}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onGoBack={onGoBack}
        onGoForward={onGoForward}
        onToggleLeftSidebar={onToggleLeftSidebar}
        headerRef={headerRef}
      />
    );
  };

  const chatStateProvider =
    layoutConfig.chatStateProvider ??
    (routeContext.resourceId && routeContext.resourceType
      ? createResourceChatStateProvider({
          resourceId: routeContext.resourceId,
          resourceType: routeContext.resourceType,
          viewer: routeContext.viewer,
        })
      : undefined);

  const chatPanel = (
    <ChatPanel
      // overlay 需要收起按钮关闭；桌面 dock 仍由资源顶栏开关
      showCollapseButton={isCompactChat}
      resourceChat={{
        provider: chatStateProvider,
        context: resourceChatContext,
        clearContext: clearResourceChatContext,
      }}
      agentDebug={layoutConfig.chatAgentDebug}
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
    <ResourceHostContext value={resourceHostContext}>
      <div className={cn(styles.shell, overlayChatOpen && styles.shellWithOverlay)}>
        <SystemResizablePanelGroup
          orientation="horizontal"
          className={styles.root}
          resizeTargetMinimumSize={RESIZE_TARGET_MINIMUM_SIZE}
          onLayoutChanged={handleLayoutChanged}
        >
          <SystemResizablePanel
            minSize={isCompactChat ? 0 : RESOURCE_MAIN_MIN_WIDTH}
            className={styles.resourcePanel}
          >
            <ResourceFrame
              className={layoutConfig.className}
              bodyClassName={layoutConfig.bodyClassName}
              header={renderHeader()}
            >
              {children}
            </ResourceFrame>
          </SystemResizablePanel>

          {!isCompactChat ? (
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
  );
}

export default AppResourceShell;
