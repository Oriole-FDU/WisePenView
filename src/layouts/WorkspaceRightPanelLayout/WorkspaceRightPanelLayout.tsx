import { clsx } from 'clsx';
import { type CSSProperties, useRef } from 'react';
import type { Layout, LayoutChangedMeta, PanelSize } from 'react-resizable-panels';

import {
  RESIZE_TARGET_MINIMUM_SIZE,
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
} from '@/components/base/SystemResizable';
import { PANEL_RESIZE_DURATION_MS, PANEL_RESIZE_EASING } from '@/constants/layoutMotion';
import { LAYOUT_RESIZE_HANDLE_RESERVE } from '@/constants/layoutScale';

import { WorkspacePanelPortalProvider } from './_context';
import { useWorkspacePanelMotion } from './controllers/useWorkspacePanelMotion';
import type { WorkspaceRightPanelLayoutProps } from './index.type';
import styles from './style.module.scss';
import { getWorkspacePanelSlotLabelId, type WorkspacePanelId } from './workspacePanelModel';
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
  const pendingWidthRef = useRef<number | null>(null);
  const activePanel = findActivePanel(panelSlots, activePanelId);
  const open = Boolean(activePanel);
  const motion = useWorkspacePanelMotion({ activePanel, panelSlots, panelWidths });
  const canvasMinWidth = activePanel
    ? mainMinWidth + motion.panelSize + LAYOUT_RESIZE_HANDLE_RESERVE
    : mainMinWidth;
  const canvasStyle = {
    minWidth: `${canvasMinWidth}px`,
    '--workspace-panel-motion-duration': `${PANEL_RESIZE_DURATION_MS}ms`,
    '--workspace-panel-motion-ease': PANEL_RESIZE_EASING,
  } as CSSProperties;

  const handleResize = (size: PanelSize) => {
    if (activePanel && !motion.transitioning) pendingWidthRef.current = Math.round(size.inPixels);
  };

  const handleLayoutChanged = (_layout: Layout, meta: LayoutChangedMeta) => {
    const pendingWidth = pendingWidthRef.current;
    pendingWidthRef.current = null;
    if (meta.isUserInteraction && !motion.transitioning && activePanel && pendingWidth != null) {
      onPanelResize(activePanel.id, pendingWidth);
    }
  };

  return (
    <WorkspacePanelPortalProvider>
      <div
        className={clsx(styles.viewport, className)}
        data-panel-transitioning={motion.transitioning || undefined}
      >
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

            <SystemResizableHandle
              collapsed={!motion.visiblePanel}
              disabled={!open || motion.transitioning}
              aria-label={resizeLabel}
            />

            <SystemResizablePanel
              id={RIGHT_PANEL_DOM_ID}
              panelRef={motion.panelRef}
              defaultSize={motion.panelSize}
              minSize={motion.minSize}
              maxSize={motion.maxSize}
              groupResizeBehavior="preserve-pixel-size"
              className={styles.rightPanel}
              inert={!open}
              aria-hidden={!open || undefined}
              onResize={handleResize}
            >
              <div
                className={styles.panelStack}
                style={motion.transitioning ? { minWidth: motion.visibleWidth } : undefined}
              >
                {panelSlots.map((panel) => (
                  <WorkspacePanelTarget
                    key={panel.id}
                    panelId={panel.id}
                    active={panel.id === motion.visiblePanel?.id}
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
