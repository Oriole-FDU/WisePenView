import { registerStore } from '@/store/lifecycle';
import { createStoreJSONStorage } from '@/store/persistence';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarDriveExpansionState {
  expandedNodeIdsByScope: Record<string, string[]>;
  setExpandedNodeIds: (scopeKey: string, nodeIds: string[]) => void;
}

const DEFAULT_SIDEBAR_DRIVE_EXPANSION_STATE = {
  expandedNodeIdsByScope: {} as Record<string, string[]>,
};

export const useSidebarDriveExpansionStore = create<SidebarDriveExpansionState>()(
  persist(
    (set) => ({
      ...DEFAULT_SIDEBAR_DRIVE_EXPANSION_STATE,
      setExpandedNodeIds: (scopeKey, nodeIds) =>
        set((state) => {
          const normalizedNodeIds = [...new Set(nodeIds)];
          const currentNodeIds = state.expandedNodeIdsByScope[scopeKey] ?? [];
          if (
            currentNodeIds.length === normalizedNodeIds.length &&
            currentNodeIds.every((nodeId, index) => nodeId === normalizedNodeIds[index])
          ) {
            return state;
          }
          return {
            expandedNodeIdsByScope: {
              ...state.expandedNodeIdsByScope,
              [scopeKey]: normalizedNodeIds,
            },
          };
        }),
    }),
    {
      name: 'sidebar-drive-expansion',
      storage: createStoreJSONStorage('session'),
      version: 1,
      migrate: () => DEFAULT_SIDEBAR_DRIVE_EXPANSION_STATE,
    }
  )
);

const resetSidebarDriveExpansionStore = (): void => {
  useSidebarDriveExpansionStore.setState(DEFAULT_SIDEBAR_DRIVE_EXPANSION_STATE);
};

registerStore({
  id: 'sidebar.drive-expansion',
  scope: 'session',
  reset: resetSidebarDriveExpansionStore,
});
