import { useRef, useState } from 'react';
import type { PanelImperativeHandle } from 'react-resizable-panels';

import { useResizablePanelSize } from '@/hooks/useResizablePanelSize';

import type { WorkspaceRightPanelLayoutProps } from '../index.type';
import { clampWorkspacePanelWidth, type WorkspacePanelSlot } from '../workspacePanelModel';

interface UseWorkspacePanelMotionOptions {
  activePanel: WorkspacePanelSlot | undefined;
  panelSlots: WorkspaceRightPanelLayoutProps['panelSlots'];
  panelWidths: WorkspaceRightPanelLayoutProps['panelWidths'];
}

export function useWorkspacePanelMotion({
  activePanel,
  panelSlots,
  panelWidths,
}: UseWorkspacePanelMotionOptions) {
  const panelRef = useRef<PanelImperativeHandle | null>(null);
  const targetPanelId = activePanel?.id ?? null;
  const [motion, setMotion] = useState({
    targetPanelId,
    visiblePanelId: targetPanelId,
    settled: true,
  });

  // 关闭时保留原槽位参与绘制；逻辑关闭与可交互状态仍立即生效。
  if (motion.targetPanelId !== targetPanelId) {
    setMotion({
      targetPanelId,
      visiblePanelId: targetPanelId ?? motion.visiblePanelId,
      settled: false,
    });
  }

  const visiblePanel = panelSlots.find((panel) => panel.id === motion.visiblePanelId);
  const visibleWidth = visiblePanel
    ? clampWorkspacePanelWidth(visiblePanel.id, panelWidths[visiblePanel.id])
    : 0;
  const panelSize = activePanel
    ? clampWorkspacePanelWidth(activePanel.id, panelWidths[activePanel.id])
    : 0;

  useResizablePanelSize({
    panelRef,
    size: panelSize,
    animate: !motion.settled,
    onComplete: () => {
      setMotion((current) =>
        current.settled
          ? current
          : { ...current, visiblePanelId: current.targetPanelId, settled: true }
      );
    },
  });

  return {
    panelRef,
    panelSize,
    visiblePanel,
    visibleWidth,
    transitioning: !motion.settled,
    // 插值期间允许经过小于展开下限的宽度，否则约束会把动画钳成跳变。
    minSize: motion.settled ? (activePanel?.minWidth ?? 0) : 0,
    maxSize: Math.max(activePanel?.maxWidth ?? 0, visiblePanel?.maxWidth ?? 0),
  };
}
