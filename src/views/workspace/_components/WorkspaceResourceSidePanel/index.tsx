import { NOTE_EDITOR_MIN_WIDTH } from '@/constants/layoutScale';
import {
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
} from '@/layouts/_common/SystemResizable';
import { useResizablePanelSize } from '@/layouts/_common/useResizablePanelSize';
import clsx from 'clsx';
import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  Layout,
  LayoutChangedMeta,
  PanelImperativeHandle,
  PanelSize,
} from 'react-resizable-panels';
import type { ResourceHostSidePanelConfig } from '../../ResourceHostContext';
import {
  useWorkspaceResourceSidePanelStore,
  WORKSPACE_RESOURCE_SIDE_PANEL_MAX_WIDTH,
  WORKSPACE_RESOURCE_SIDE_PANEL_MIN_WIDTH,
} from '../../_store/useWorkspaceResourceSidePanelStore';
import ResourceCommentPanel from './ResourceCommentPanel';
import styles from './style.module.less';

const RESIZE_TARGET_MINIMUM_SIZE = { fine: 16, coarse: 32 };

interface WorkspaceResourceSidePanelProps {
  resourceId: string;
  config?: ResourceHostSidePanelConfig;
  children: ReactNode;
}

function WorkspaceResourceSidePanel({
  resourceId,
  config,
  children,
}: WorkspaceResourceSidePanelProps) {
  const { t } = useTranslation('resource');
  const storedMode = useWorkspaceResourceSidePanelStore(
    (state) => state.modeByResourceId[resourceId] ?? 'closed'
  );
  const width = useWorkspaceResourceSidePanelStore((state) => state.width);
  const setWidth = useWorkspaceResourceSidePanelStore((state) => state.setWidth);
  const sidePanelRef = useRef<PanelImperativeHandle | null>(null);
  const pendingWidthRef = useRef<number | null>(null);
  const inlineCommentAvailable = Boolean(config?.inlineComment);
  const activeMode =
    storedMode === 'inlineComment' && !inlineCommentAvailable ? 'closed' : storedMode;
  const open = Boolean(config) && activeMode !== 'closed';
  const panelSize = open ? width : 0;

  useResizablePanelSize({ panelRef: sidePanelRef, size: panelSize });

  const handleResize = (panelSize: PanelSize) => {
    if (!open) return;
    pendingWidthRef.current = panelSize.inPixels;
  };

  const handleLayoutChanged = (_layout: Layout, meta: LayoutChangedMeta) => {
    const pendingWidth = pendingWidthRef.current;
    pendingWidthRef.current = null;
    if (meta.isUserInteraction && open && pendingWidth != null) setWidth(pendingWidth);
  };

  const panelContent =
    activeMode === 'inlineComment' ? (
      config?.inlineComment
    ) : config ? (
      <ResourceCommentPanel
        key={config.resource.resourceId}
        resource={config.resource}
        onResourceChanged={config.onResourceChanged}
      />
    ) : null;
  const panelTitle =
    activeMode === 'inlineComment' ? t('sidePanel.annotation') : t('sidePanel.comments');

  return (
    <div className={styles.scrollHost}>
      <SystemResizablePanelGroup
        orientation="horizontal"
        className={clsx(styles.root, open && styles.rootWithSidePanel)}
        resizeTargetMinimumSize={RESIZE_TARGET_MINIMUM_SIZE}
        onLayoutChanged={handleLayoutChanged}
      >
        <SystemResizablePanel
          id="workspace-resource-renderer"
          minSize={NOTE_EDITOR_MIN_WIDTH}
          className={styles.resourceRenderer}
        >
          {children}
        </SystemResizablePanel>

        <SystemResizableHandle
          className={clsx(styles.resizeHandle, !open && styles.resizeHandleCollapsed)}
          disabled={!open}
        />

        <SystemResizablePanel
          id="workspace-resource-side-panel"
          panelRef={sidePanelRef}
          defaultSize={panelSize}
          minSize={open ? WORKSPACE_RESOURCE_SIDE_PANEL_MIN_WIDTH : 0}
          maxSize={open ? WORKSPACE_RESOURCE_SIDE_PANEL_MAX_WIDTH : 0}
          className={styles.sidePanel}
          aria-label={
            activeMode === 'inlineComment'
              ? t('sidePanel.annotationAria')
              : t('sidePanel.commentsAria')
          }
          aria-hidden={!open ? true : undefined}
          onResize={handleResize}
        >
          {open ? (
            <section className={styles.panelFrame} aria-label={panelTitle}>
              <header className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>{panelTitle}</h2>
              </header>
              <div className={styles.panelBody}>{panelContent}</div>
            </section>
          ) : null}
        </SystemResizablePanel>
      </SystemResizablePanelGroup>
    </div>
  );
}

export default WorkspaceResourceSidePanel;
