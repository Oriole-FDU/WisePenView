import { createStore } from 'zustand/vanilla';

import type { EditorPresentation } from '../editor.type';

export interface EditorPresentationState {
  presentation: EditorPresentation;
  onPresentationChange(presentation: EditorPresentation): () => void;
}

export function createEditorPresentationStore() {
  return createStore<EditorPresentationState>((set, get) => ({
    presentation: {},
    onPresentationChange: (presentation) => {
      set({ presentation });
      return () => {
        if (get().presentation === presentation) set({ presentation: {} });
      };
    },
  }));
}
