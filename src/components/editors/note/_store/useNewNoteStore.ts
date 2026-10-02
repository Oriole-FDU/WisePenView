import { create } from 'zustand';

import { registerStore } from '@/store/lifecycle';

interface NewNoteState {
  newNoteResourceId: string | null;
  setNewNoteResourceId: (resourceId: string) => void;
  markNewNoteDirty: (resourceId: string) => void;
}

const DEFAULT_NEW_NOTE_STATE = {
  newNoteResourceId: null as string | null,
};

export const useNewNoteStore = create<NewNoteState>()((set) => ({
  ...DEFAULT_NEW_NOTE_STATE,

  setNewNoteResourceId: (resourceId) => set({ newNoteResourceId: resourceId }),

  markNewNoteDirty: (resourceId) =>
    set((state) => {
      if (state.newNoteResourceId !== resourceId) {
        return state;
      }
      return DEFAULT_NEW_NOTE_STATE;
    }),
}));

export const clearNewNoteStore = (resourceId?: string): void => {
  if (resourceId && useNewNoteStore.getState().newNoteResourceId !== resourceId) {
    return;
  }
  useNewNoteStore.setState(DEFAULT_NEW_NOTE_STATE);
};

registerStore({
  id: 'note-ui.new-note',
  scope: 'tab',
  reset: clearNewNoteStore,
});
