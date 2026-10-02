import { create } from 'zustand';

import { registerStore } from '@/store/lifecycle';

interface PendingNoteImport {
  markdown: string;
  sourceFileName: string;
}

interface PendingNoteImportState {
  pendingByResourceId: Record<string, PendingNoteImport>;
  setPendingImport: (resourceId: string, pendingImport: PendingNoteImport) => void;
  removePendingImport: (resourceId: string) => void;
}

const DEFAULT_PENDING_NOTE_IMPORT_STATE = {
  pendingByResourceId: {} as Record<string, PendingNoteImport>,
};

export const usePendingNoteImportStore = create<PendingNoteImportState>()((set) => ({
  ...DEFAULT_PENDING_NOTE_IMPORT_STATE,

  setPendingImport: (resourceId, pendingImport) =>
    set((state) => ({
      pendingByResourceId: {
        ...state.pendingByResourceId,
        [resourceId]: pendingImport,
      },
    })),

  removePendingImport: (resourceId) =>
    set((state) => {
      if (!state.pendingByResourceId[resourceId]) {
        return state;
      }
      const pendingByResourceId = { ...state.pendingByResourceId };
      delete pendingByResourceId[resourceId];
      return { pendingByResourceId };
    }),
}));

const resetPendingNoteImportStore = (): void => {
  usePendingNoteImportStore.setState(DEFAULT_PENDING_NOTE_IMPORT_STATE);
};

registerStore({
  id: 'note-ui.pending-markdown-import',
  scope: 'tab',
  reset: resetPendingNoteImportStore,
});
