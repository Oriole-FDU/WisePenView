import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { clampResourceSidePanelWidth } from '@/constants/layoutScale';
import { registerStore } from '@/store/lifecycle';
import { createStoreJSONStorage } from '@/store/persistence';

export const RESOURCE_SIDE_PANEL_DEFAULT_WIDTH = 360;

export type ResourceSidePanelMode = 'closed' | 'inlineComment' | 'comment';

interface ResourceSidePanelState {
  modeByResourceId: Record<string, ResourceSidePanelMode>;
  width: number;
  setMode: (resourceId: string, mode: ResourceSidePanelMode) => void;
  toggleMode: (resourceId: string, mode: Exclude<ResourceSidePanelMode, 'closed'>) => void;
  setWidth: (width: number) => void;
}

const DEFAULT_STATE = {
  modeByResourceId: {} as Record<string, ResourceSidePanelMode>,
  width: RESOURCE_SIDE_PANEL_DEFAULT_WIDTH,
};

export const useResourceSidePanelStore = create<ResourceSidePanelState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,
      setMode: (resourceId, mode) =>
        set((state) => {
          if (state.modeByResourceId[resourceId] === mode) return state;
          return { modeByResourceId: { ...state.modeByResourceId, [resourceId]: mode } };
        }),
      toggleMode: (resourceId, mode) => {
        const currentMode = get().modeByResourceId[resourceId] ?? 'closed';
        get().setMode(resourceId, currentMode === mode ? 'closed' : mode);
      },
      setWidth: (width) => {
        const nextWidth = clampResourceSidePanelWidth(width);
        set((state) => (state.width === nextWidth ? state : { width: nextWidth }));
      },
    }),
    {
      name: 'resource-side-panel',
      storage: createStoreJSONStorage('tab'),
      version: 1,
      migrate: () => ({ width: RESOURCE_SIDE_PANEL_DEFAULT_WIDTH }),
      partialize: (state) => ({ width: state.width }),
      merge: (persisted, current) => {
        const stored = persisted as Partial<ResourceSidePanelState> | undefined;
        return {
          ...current,
          ...stored,
          width: clampResourceSidePanelWidth(stored?.width ?? current.width),
          modeByResourceId: current.modeByResourceId,
        };
      },
    }
  )
);

const resetResourceSidePanelStore = (): void => {
  useResourceSidePanelStore.setState(DEFAULT_STATE);
};

registerStore({
  id: 'resource.side-panel',
  scope: 'tab',
  reset: resetResourceSidePanelStore,
});
