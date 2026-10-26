import { useWorkspaceRightPanelStore } from './_store/useWorkspaceRightPanelStore';
import type { WorkspacePanelId } from './workspacePanelModel';

export const workspaceRightPanelActions = {
  openPanel: (panelId: WorkspacePanelId) =>
    useWorkspaceRightPanelStore.getState().setActivePanel(panelId),
  togglePanel: (panelId: WorkspacePanelId) => {
    const state = useWorkspaceRightPanelStore.getState();
    state.setActivePanel(state.activePanelId === panelId ? null : panelId);
  },
  closePanel: () => useWorkspaceRightPanelStore.getState().setActivePanel(null),
  setPanelWidth: (panelId: WorkspacePanelId, width: number) =>
    useWorkspaceRightPanelStore.getState().setPanelWidth(panelId, width),
};
