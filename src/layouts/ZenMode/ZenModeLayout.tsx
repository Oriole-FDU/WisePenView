import AppIconButton from '@/components/AppIconButton';
import ChatPanel from '@/components/ChatPanel';
import { useCurrentChatSessionStore } from '@/components/ChatPanel/_store/useCurrentChatSessionStore';
import { clearNewChatSessionStore } from '@/components/ChatPanel/_store/useNewChatSessionStore';
import {
  createResourceChatStateProvider,
  type ResourceChatContext,
} from '@/components/ChatPanel/ResourceChatProtocol';
import type { DriveSelectionItem } from '@/components/Drive/common/driveComponentModel';
import DriveNavigator from '@/components/Drive/DriveNavigator';
import AppModal from '@/components/Overlay/AppModal';
import {
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
} from '@/layouts/_common/SystemResizable';
import { useAppNavigation } from '@/layouts/AppNavigation/AppNavigationContext';
import {
  resolveResourceKind,
  resolveResourceViewer,
  type ResourceTarget,
} from '@/utils/navigation/resourceTarget';
import {
  ResourceHostContext,
  type OpenResourceTarget,
  type ResourceHostContextValue,
  type ResourceHostLayoutConfig,
} from '@/views/workspace/ResourceHostContext';
import ResourceRenderer from '@/views/workspace/ResourceRenderer';
import { Button } from '@heroui/react';
import clsx from 'clsx';
import { FolderOpen, PanelsTopLeft, X } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Layout, LayoutChangedMeta, PanelSize } from 'react-resizable-panels';
import ZenResourceFrame from './_components/ZenResourceFrame';
import {
  ZEN_PANE_IDS,
  useZenModeStore,
  type ZenPaneId,
  type ZenPaneState,
} from './_store/useZenModeStore';
import styles from './ZenModeLayout.module.less';
import { isZenModeNodeSelectable, normalizeZenModeTarget } from './zenModeResource';

const RESOURCE_PANE_MIN_WIDTH = 320;
const CHAT_PANEL_MIN_WIDTH = 480;
const CHAT_PANEL_MAX_WIDTH = 720;
const RESIZE_TARGET_MINIMUM_SIZE = { fine: 16, coarse: 32 };

interface ZenPaneRuntime {
  layoutConfig: ResourceHostLayoutConfig;
  chatContext?: ResourceChatContext;
}

type ZenPaneRuntimeMap = Record<ZenPaneId, ZenPaneRuntime>;

const createInitialRuntimeMap = (): ZenPaneRuntimeMap => ({
  [ZEN_PANE_IDS[0]]: { layoutConfig: {} },
  [ZEN_PANE_IDS[1]]: { layoutConfig: {} },
});

interface ZenResourcePaneProps {
  pane: ZenPaneState;
  active: boolean;
  runtime: ZenPaneRuntime;
  onActivate: (paneId: ZenPaneId) => void;
  onRuntimeChange: (paneId: ZenPaneId, runtime: Partial<ZenPaneRuntime>) => void;
}

function ZenResourcePane({
  pane,
  active,
  runtime,
  onActivate,
  onRuntimeChange,
}: ZenResourcePaneProps) {
  const setPaneTarget = useZenModeStore((state) => state.setPaneTarget);
  const setPaneLocation = useZenModeStore((state) => state.setPaneLocation);
  const clearPane = useZenModeStore((state) => state.clearPane);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<DriveSelectionItem | null>(null);
  const target = normalizeZenModeTarget(pane.target);

  const setLayoutConfig = useCallback(
    (layoutConfig: ResourceHostLayoutConfig) => {
      onRuntimeChange(pane.paneId, { layoutConfig });
    },
    [onRuntimeChange, pane.paneId]
  );
  const resetLayoutConfig = useCallback(() => {
    onRuntimeChange(pane.paneId, { layoutConfig: {}, chatContext: undefined });
  }, [onRuntimeChange, pane.paneId]);
  const setChatContext = useCallback(
    (chatContext: ResourceChatContext) => {
      onRuntimeChange(pane.paneId, { chatContext });
    },
    [onRuntimeChange, pane.paneId]
  );
  const clearChatContext = useCallback(
    (chatContext?: ResourceChatContext) => {
      if (chatContext && runtime.chatContext !== chatContext) return;
      onRuntimeChange(pane.paneId, { chatContext: undefined });
    },
    [onRuntimeChange, pane.paneId, runtime.chatContext]
  );
  const handleClosePane = useCallback(() => {
    clearPane(pane.paneId);
    onRuntimeChange(pane.paneId, { layoutConfig: {}, chatContext: undefined });
  }, [clearPane, onRuntimeChange, pane.paneId]);
  const openResource = useCallback(
    (next: OpenResourceTarget) => {
      const resourceId = next.resourceId.trim();
      if (!resourceId) return;
      const resourceType = resolveResourceKind({
        resourceType: next.resourceType,
        resourceName: next.resourceName,
      });
      const viewer = resolveResourceViewer({
        resourceType: next.resourceType ?? resourceType,
        resourceName: next.resourceName,
        viewer: next.viewer,
      });
      setPaneTarget(pane.paneId, {
        resourceId,
        resourceType,
        resourceName: next.resourceName,
        viewer,
      });
      if ('parentNodeId' in next.driveLocation) {
        setPaneLocation(pane.paneId, {
          scope: next.driveLocation.scope,
          resource: {
            resourceId,
            parentNodeId: next.driveLocation.parentNodeId,
            ...(next.driveLocation.nodeId ? { nodeId: next.driveLocation.nodeId } : {}),
          },
        });
      } else {
        setPaneLocation(pane.paneId, { scope: next.driveLocation.scope });
      }
      onActivate(pane.paneId);
    },
    [onActivate, pane.paneId, setPaneLocation, setPaneTarget]
  );
  const resourceHostContext = useMemo<ResourceHostContextValue>(() => {
    return {
      hostId: pane.paneId,
      routeContext: {
        resourceId: target?.resourceId,
        resourceType: target?.resourceType,
        viewer: target?.viewer,
      },
      getNavigationScope: () => useZenModeStore.getState().panes[pane.paneId].location.scope,
      openResource,
      setLayoutConfig,
      resetLayoutConfig,
      setChatContext,
      clearChatContext,
    };
  }, [
    clearChatContext,
    openResource,
    pane.paneId,
    resetLayoutConfig,
    setChatContext,
    setLayoutConfig,
    target?.resourceId,
    target?.resourceType,
    target?.viewer,
  ]);

  const handlePickerOpenChange = (open: boolean) => {
    setPickerOpen(open);
    if (!open) setSelectedResource(null);
  };

  const handleTargetChange = useCallback(
    (nextTarget: ResourceTarget) => {
      setPaneTarget(pane.paneId, nextTarget);
    },
    [pane.paneId, setPaneTarget]
  );

  const handleConfirmResource = () => {
    if (!selectedResource?.resourceId || !selectedResource.parentNodeId) return;
    openResource({
      resourceId: selectedResource.resourceId,
      resourceType: selectedResource.resourceType,
      resourceName: selectedResource.label,
      driveLocation: {
        scope: selectedResource.scope,
        nodeId: selectedResource.nodeId,
        parentNodeId: selectedResource.parentNodeId,
      },
    });
    handlePickerOpenChange(false);
  };

  const runtimeHeader =
    runtime.layoutConfig.header === false ? undefined : runtime.layoutConfig.header;
  const paneTitle = target?.resourceName ?? runtimeHeader?.resource?.resourceName ?? '资源版面';

  return (
    <section
      className={clsx(styles.resourcePane, active && styles.resourcePaneActive)}
      aria-label={paneTitle}
      onPointerDown={() => onActivate(pane.paneId)}
    >
      <div className={styles.paneTitleBar}>
        <span className={styles.paneTitle}>{target ? paneTitle : '空白版面'}</span>
        <span className={styles.paneActions}>
          <AppIconButton
            icon={<FolderOpen size={15} aria-hidden="true" />}
            label={target ? '替换资源' : '选择资源'}
            onPress={() => setPickerOpen(true)}
          />
          {target ? (
            <AppIconButton
              icon={<X size={15} aria-hidden="true" />}
              label="关闭资源"
              onPress={handleClosePane}
            />
          ) : null}
        </span>
      </div>

      <div className={styles.paneBody}>
        {target ? (
          <ResourceHostContext value={resourceHostContext}>
            <ZenResourceFrame
              className={runtime.layoutConfig.className}
              bodyClassName={runtime.layoutConfig.bodyClassName}
            >
              <ResourceRenderer
                key={`${target.resourceType}:${target.resourceId}:${target.viewer ?? ''}`}
                target={target}
                onTargetChange={handleTargetChange}
                onClose={handleClosePane}
              />
            </ZenResourceFrame>
          </ResourceHostContext>
        ) : (
          <button type="button" className={styles.emptySlot} onClick={() => setPickerOpen(true)}>
            <FolderOpen size={24} aria-hidden="true" />
            <span>从云盘选择文件</span>
          </button>
        )}
      </div>

      <AppModal
        isOpen={pickerOpen}
        onOpenChange={handlePickerOpenChange}
        title="选择版面资源"
        size="md"
        contentMode="dialog"
      >
        <AppModal.Body>
          <div className={styles.navigator}>
            <DriveNavigator
              scopeMode="all"
              selectableTypes={['resource', 'link']}
              isNodeSelectable={isZenModeNodeSelectable}
              onChange={(items) => setSelectedResource(items[0] ?? null)}
            />
          </div>
        </AppModal.Body>
        <AppModal.Footer>
          <Button variant="secondary" onPress={() => handlePickerOpenChange(false)}>
            取消
          </Button>
          <Button variant="primary" isDisabled={!selectedResource} onPress={handleConfirmResource}>
            打开
          </Button>
        </AppModal.Footer>
      </AppModal>
    </section>
  );
}

function ZenModeLayout() {
  const appNavigation = useAppNavigation();
  const panes = useZenModeStore((state) => state.panes);
  const activePaneId = useZenModeStore((state) => state.activePaneId);
  const primaryPanePercentage = useZenModeStore((state) => state.primaryPanePercentage);
  const chatWidth = useZenModeStore((state) => state.chatWidth);
  const setActivePane = useZenModeStore((state) => state.setActivePane);
  const setPrimaryPanePercentage = useZenModeStore((state) => state.setPrimaryPanePercentage);
  const setChatWidth = useZenModeStore((state) => state.setChatWidth);
  const clearCurrentSession = useCurrentChatSessionStore((state) => state.clearCurrentSession);
  const [runtimeByPaneId, setRuntimeByPaneId] =
    useState<ZenPaneRuntimeMap>(createInitialRuntimeMap);
  const pendingPrimaryPanePercentageRef = useRef<number | null>(null);
  const pendingChatWidthRef = useRef<number | null>(null);

  const handleRuntimeChange = useCallback((paneId: ZenPaneId, runtime: Partial<ZenPaneRuntime>) => {
    setRuntimeByPaneId((current) => ({
      ...current,
      [paneId]: { ...current[paneId], ...runtime },
    }));
  }, []);

  const handleResourcePaneResize = useCallback(
    (size: PanelSize, paneId: string | number | undefined) => {
      if (paneId !== ZEN_PANE_IDS[0]) return;
      pendingPrimaryPanePercentageRef.current = size.asPercentage;
    },
    []
  );

  const handleResourceLayoutChanged = useCallback(
    (_layout: Layout, meta: LayoutChangedMeta) => {
      const percentage = pendingPrimaryPanePercentageRef.current;
      pendingPrimaryPanePercentageRef.current = null;
      if (meta.isUserInteraction && percentage != null) {
        setPrimaryPanePercentage(percentage);
      }
    },
    [setPrimaryPanePercentage]
  );

  const handleChatResize = useCallback((size: PanelSize) => {
    pendingChatWidthRef.current = size.inPixels;
  }, []);

  const handleShellLayoutChanged = useCallback(
    (_layout: Layout, meta: LayoutChangedMeta) => {
      const width = pendingChatWidthRef.current;
      pendingChatWidthRef.current = null;
      if (meta.isUserInteraction && width != null) setChatWidth(width);
    },
    [setChatWidth]
  );

  const handleNewChat = useCallback(() => {
    clearCurrentSession();
    clearNewChatSessionStore();
  }, [clearCurrentSession]);

  const activeTarget = panes[activePaneId].target;
  const activeRuntime = runtimeByPaneId[activePaneId];
  const activeChatProvider = useMemo(() => {
    if (activeRuntime.layoutConfig.chatStateProvider) {
      return activeRuntime.layoutConfig.chatStateProvider;
    }
    if (!activeTarget?.resourceId || !activeTarget.resourceType) return undefined;
    return createResourceChatStateProvider({
      resourceId: activeTarget.resourceId,
      resourceType: activeTarget.resourceType,
      viewer: activeTarget.viewer,
    });
  }, [activeRuntime.layoutConfig.chatStateProvider, activeTarget]);

  return (
    <div className={styles.root}>
      <header className={styles.zenBar}>
        <AppIconButton
          icon={<X size={17} aria-hidden="true" />}
          label="退出 Zen Mode"
          onPress={appNavigation.goBack}
        />
        <PanelsTopLeft size={16} aria-hidden="true" />
        <span className={styles.zenTitle}>Zen Mode</span>
      </header>

      <div className={styles.content}>
        <SystemResizablePanelGroup
          orientation="horizontal"
          resizeTargetMinimumSize={RESIZE_TARGET_MINIMUM_SIZE}
          onLayoutChanged={handleShellLayoutChanged}
        >
          <SystemResizablePanel
            minSize={RESOURCE_PANE_MIN_WIDTH * 2}
            className={styles.resourceArea}
          >
            <SystemResizablePanelGroup
              orientation="horizontal"
              resizeTargetMinimumSize={RESIZE_TARGET_MINIMUM_SIZE}
              onLayoutChanged={handleResourceLayoutChanged}
            >
              <SystemResizablePanel
                id={ZEN_PANE_IDS[0]}
                minSize={RESOURCE_PANE_MIN_WIDTH}
                defaultSize={`${primaryPanePercentage}%`}
                className={styles.resourcePanel}
                onResize={handleResourcePaneResize}
              >
                <ZenResourcePane
                  pane={panes[ZEN_PANE_IDS[0]]}
                  active={activePaneId === ZEN_PANE_IDS[0]}
                  runtime={runtimeByPaneId[ZEN_PANE_IDS[0]]}
                  onActivate={setActivePane}
                  onRuntimeChange={handleRuntimeChange}
                />
              </SystemResizablePanel>

              <SystemResizableHandle className={styles.resizeHandle} />

              <SystemResizablePanel
                id={ZEN_PANE_IDS[1]}
                minSize={RESOURCE_PANE_MIN_WIDTH}
                defaultSize={`${100 - primaryPanePercentage}%`}
                className={styles.resourcePanel}
              >
                <ZenResourcePane
                  pane={panes[ZEN_PANE_IDS[1]]}
                  active={activePaneId === ZEN_PANE_IDS[1]}
                  runtime={runtimeByPaneId[ZEN_PANE_IDS[1]]}
                  onActivate={setActivePane}
                  onRuntimeChange={handleRuntimeChange}
                />
              </SystemResizablePanel>
            </SystemResizablePanelGroup>
          </SystemResizablePanel>

          <SystemResizableHandle className={styles.resizeHandle} />

          <SystemResizablePanel
            id="zen-chat-dock"
            minSize={CHAT_PANEL_MIN_WIDTH}
            maxSize={CHAT_PANEL_MAX_WIDTH}
            defaultSize={chatWidth}
            groupResizeBehavior="preserve-pixel-size"
            className={styles.chatDock}
            onResize={handleChatResize}
          >
            <ChatPanel
              collapsed={false}
              showCollapseButton={false}
              onNewChat={handleNewChat}
              resourceChat={{
                provider: activeChatProvider,
                context: activeRuntime.chatContext,
                clearContext: (context) => {
                  if (context && activeRuntime.chatContext !== context) return;
                  handleRuntimeChange(activePaneId, { chatContext: undefined });
                },
              }}
            />
          </SystemResizablePanel>
        </SystemResizablePanelGroup>
      </div>
    </div>
  );
}

export default ZenModeLayout;
