import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { WORKSPACE_CONTEXT_PANEL_DEFAULT_WIDTH } from '@/constants/layoutScale';
import { registerStore } from '@/store/lifecycle';
import { createStoreJSONStorage } from '@/store/persistence';

import {
  clampWorkspacePanelWidth,
  WORKSPACE_PANEL_IDS,
  type WorkspacePanelId,
} from '../workspacePanelModel';

interface WorkspaceRightPanelState {
  activePanelId: WorkspacePanelId | null;
  panelWidths: Record<WorkspacePanelId, number>;
  setActivePanel: (panelId: WorkspacePanelId | null) => void;
  setPanelWidth: (panelId: WorkspacePanelId, width: number) => void;
}

// 旧布局宽度只存在当前标签页，统一后直接使用默认值，避免保留一次性迁移分支。
const DEFAULT_PANEL_WIDTHS: Record<WorkspacePanelId, number> = {
  chat: clampWorkspacePanelWidth('chat', 480),
  inlineComment: clampWorkspacePanelWidth('inlineComment', WORKSPACE_CONTEXT_PANEL_DEFAULT_WIDTH),
  interact: clampWorkspacePanelWidth('interact', WORKSPACE_CONTEXT_PANEL_DEFAULT_WIDTH),
};

const DEFAULT_STATE = {
  activePanelId: 'chat' as WorkspacePanelId | null,
  panelWidths: DEFAULT_PANEL_WIDTHS,
};

export const useWorkspaceRightPanelStore = create<WorkspaceRightPanelState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setActivePanel: (panelId) =>
        set((state) => (state.activePanelId === panelId ? state : { activePanelId: panelId })),
      setPanelWidth: (panelId, width) => {
        const nextWidth = clampWorkspacePanelWidth(panelId, width);
        set((state) =>
          state.panelWidths[panelId] === nextWidth
            ? state
            : {
                panelWidths: {
                  ...state.panelWidths,
                  [panelId]: nextWidth,
                },
              }
        );
      },
    }),
    {
      name: 'workspace-right-panel',
      storage: createStoreJSONStorage('tab'),
      version: 1,
      partialize: (state) => ({ panelWidths: state.panelWidths }),
      merge: (persisted, current) => {
        const stored = persisted as Pick<WorkspaceRightPanelState, 'panelWidths'> | undefined;
        const panelWidths = { ...current.panelWidths };
        WORKSPACE_PANEL_IDS.forEach((panelId) => {
          const storedWidth = stored?.panelWidths?.[panelId];
          if (storedWidth != null) {
            panelWidths[panelId] = clampWorkspacePanelWidth(panelId, storedWidth);
          }
        });
        return {
          ...current,
          panelWidths,
        };
      },
    }
  )
);

const resetWorkspaceRightPanelStore = (): void => {
  useWorkspaceRightPanelStore.setState(DEFAULT_STATE);
};

registerStore({
  id: 'workspace-right-panel',
  scope: 'tab',
  reset: resetWorkspaceRightPanelStore,
});
