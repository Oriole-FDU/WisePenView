import { type ReactNode, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  Layout,
  LayoutChangedMeta,
  PanelImperativeHandle,
  PanelSize,
} from 'react-resizable-panels';

import {
  NOTE_EDITOR_MIN_WIDTH,
  RESOURCE_SIDE_PANEL_MAX_WIDTH,
  RESOURCE_SIDE_PANEL_MIN_WIDTH,
} from '@/constants/layoutScale';
import {
  RESIZE_TARGET_MINIMUM_SIZE,
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
} from '@/layouts/_common/SystemResizable';
import { useResizablePanelSize } from '@/layouts/_common/useResizablePanelSize';
import { cn } from '@/utils/cn';

import { useResourceSidePanelStore } from '../../_store/useResourceSidePanelStore';
import type { ResourceHostSidePanelConfig } from '../../ResourceHostContext';
import ResourceCommentPanel from './ResourceCommentPanel';
import styles from './style.module.less';

interface ResourceSidePanelProps {
  resourceId: string;
  config?: ResourceHostSidePanelConfig;
  children: ReactNode;
}

function ResourceSidePanel({ resourceId, config, children }: ResourceSidePanelProps) {
  const { t } = useTranslation('resource');
  const storedMode = useResourceSidePanelStore(
    (state) => state.modeByResourceId[resourceId] ?? 'closed'
  );
  const width = useResourceSidePanelStore((state) => state.width);
  const setWidth = useResourceSidePanelStore((state) => state.setWidth);
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
  const showFrameHeader = activeMode === 'inlineComment';

  return (
    <div className={styles.scrollHost}>
      <SystemResizablePanelGroup
        orientation="horizontal"
        className={cn(styles.root, open && styles.rootWithSidePanel)}
        resizeTargetMinimumSize={RESIZE_TARGET_MINIMUM_SIZE}
        onLayoutChanged={handleLayoutChanged}
      >
        <SystemResizablePanel
          id="resource-renderer"
          minSize={NOTE_EDITOR_MIN_WIDTH}
          className={styles.resourceRenderer}
        >
          {children}
        </SystemResizablePanel>

        <SystemResizableHandle
          collapsed={!open}
          disabled={!open}
          aria-label={t('sidePanel.resize')}
        />

        <SystemResizablePanel
          id="resource-side-panel"
          panelRef={sidePanelRef}
          defaultSize={panelSize}
          minSize={open ? RESOURCE_SIDE_PANEL_MIN_WIDTH : 0}
          maxSize={open ? RESOURCE_SIDE_PANEL_MAX_WIDTH : 0}
          groupResizeBehavior="preserve-pixel-size"
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
              {showFrameHeader ? (
                <header className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>{panelTitle}</h2>
                </header>
              ) : null}
              <div className={styles.panelBody}>{panelContent}</div>
            </section>
          ) : null}
        </SystemResizablePanel>
      </SystemResizablePanelGroup>
    </div>
  );
}

export default ResourceSidePanel;
