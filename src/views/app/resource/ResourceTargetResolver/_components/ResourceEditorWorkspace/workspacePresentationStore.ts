import { createStore } from 'zustand/vanilla';

import type { WorkspacePresentationState } from './index.type';

export function createWorkspacePresentationStore() {
  return createStore<WorkspacePresentationState>((set, get) => ({
    presentation: {},
    onPresentationChange: (presentation) => {
      set({ presentation });
      return () => {
        if (get().presentation === presentation) set({ presentation: {} });
      };
    },
  }));
}
