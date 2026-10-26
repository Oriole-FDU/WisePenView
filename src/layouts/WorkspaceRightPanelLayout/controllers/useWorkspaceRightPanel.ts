import { useMemoizedFn } from 'ahooks';

import { useWorkspaceRightPanelStore } from '../_store/useWorkspaceRightPanelStore';
import type { WorkspacePanelId } from '../workspacePanelModel';

export function useWorkspaceRightPanel() {
  const activePanelId = useWorkspaceRightPanelStore((state) => state.activePanelId);
  const panelWidths = useWorkspaceRightPanelStore((state) => state.panelWidths);
  const setActivePanel = useWorkspaceRightPanelStore((state) => state.setActivePanel);
  const setPanelWidth = useWorkspaceRightPanelStore((state) => state.setPanelWidth);
  const openPanel = useMemoizedFn((panelId: WorkspacePanelId) => setActivePanel(panelId));
  const togglePanel = useMemoizedFn((panelId: WorkspacePanelId) =>
    setActivePanel(activePanelId === panelId ? null : panelId)
  );
  const closePanel = useMemoizedFn(() => setActivePanel(null));

  return {
    activePanelId,
    panelWidths,
    openPanel,
    togglePanel,
    closePanel,
    setPanelWidth,
  };
}
