import { clsx } from 'clsx';
import { type CSSProperties, useRef } from 'react';
import type {
  Layout,
  LayoutChangedMeta,
  PanelImperativeHandle,
  PanelSize,
} from 'react-resizable-panels';

import {
  RESIZE_TARGET_MINIMUM_SIZE,
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
} from '@/components/base/SystemResizable';
import { LAYOUT_RESIZE_HANDLE_RESERVE } from '@/constants/layoutScale';
import { useResizablePanelSize } from '@/hooks/useResizablePanelSize';

import { WorkspacePanelPortalProvider } from './_context';
import type { WorkspaceRightPanelLayoutProps } from './index.type';
import styles from './style.module.scss';
import {
  clampWorkspacePanelWidth,
  getWorkspacePanelSlotLabelId,
  type WorkspacePanelId,
} from './workspacePanelModel';
import { WorkspacePanelTarget } from './WorkspacePanelTarget';

const RIGHT_PANEL_DOM_ID = 'workspace-right-panel';

function findActivePanel(
  panelSlots: WorkspaceRightPanelLayoutProps['panelSlots'],
  activePanelId: WorkspacePanelId | null
) {
  return activePanelId ? panelSlots.find((panel) => panel.id === activePanelId) : undefined;
}

export default function WorkspaceRightPanelLayout({
  main,
  panelSlots,
  activePanelId,
  panelWidths,
  mainMinWidth,
  panelGroupId = 'workspace-right-panel-group',
  className,
  resizeLabel,
  onPanelResize,
}: WorkspaceRightPanelLayoutProps) {
  const panelRef = useRef<PanelImperativeHandle | null>(null);
  const pendingWidthRef = useRef<number | null>(null);
  const activePanel = findActivePanel(panelSlots, activePanelId);
  const open = Boolean(activePanel);
  const panelSize = activePanel
    ? clampWorkspacePanelWidth(activePanel.id, panelWidths[activePanel.id])
    : 0;
  const canvasMinWidth = activePanel
    ? mainMinWidth + panelSize + LAYOUT_RESIZE_HANDLE_RESERVE
    : mainMinWidth;
  const canvasStyle = { minWidth: `${canvasMinWidth}px` } as CSSProperties;

  useResizablePanelSize({ panelRef, size: panelSize });

  const handleResize = (size: PanelSize) => {
    if (activePanel) pendingWidthRef.current = Math.round(size.inPixels);
  };

  const handleLayoutChanged = (_layout: Layout, meta: LayoutChangedMeta) => {
    const pendingWidth = pendingWidthRef.current;
    pendingWidthRef.current = null;
    if (meta.isUserInteraction && activePanel && pendingWidth != null) {
      onPanelResize(activePanel.id, pendingWidth);
    }
  };

  return (
    <WorkspacePanelPortalProvider>
      <div className={clsx(styles.viewport, className)}>
        <div className={styles.canvas} style={canvasStyle}>
          <SystemResizablePanelGroup
            id={panelGroupId}
            orientation="horizontal"
            className={styles.root}
            resizeTargetMinimumSize={RESIZE_TARGET_MINIMUM_SIZE}
            onLayoutChanged={handleLayoutChanged}
          >
            <SystemResizablePanel minSize={mainMinWidth} className={styles.mainPanel}>
              {main}
            </SystemResizablePanel>

            <SystemResizableHandle collapsed={!open} disabled={!open} aria-label={resizeLabel} />

            <SystemResizablePanel
              id={RIGHT_PANEL_DOM_ID}
              panelRef={panelRef}
              defaultSize={panelSize}
              minSize={activePanel?.minWidth ?? 0}
              maxSize={activePanel?.maxWidth ?? 0}
              groupResizeBehavior="preserve-pixel-size"
              className={styles.rightPanel}
              aria-hidden={!open || undefined}
              onResize={handleResize}
            >
              <div className={styles.panelStack}>
                {panelSlots.map((panel) => (
                  <WorkspacePanelTarget
                    key={panel.id}
                    panelId={panel.id}
                    active={panel.id === activePanelId}
                    labelledBy={getWorkspacePanelSlotLabelId(panel.id)}
                  />
                ))}
              </div>
              {panelSlots.map((panel) => (
                <span
                  key={panel.id}
                  id={getWorkspacePanelSlotLabelId(panel.id)}
                  className={styles.visuallyHidden}
                >
                  {panel.ariaLabel}
                </span>
              ))}
            </SystemResizablePanel>
          </SystemResizablePanelGroup>
        </div>
      </div>
    </WorkspacePanelPortalProvider>
  );
}
