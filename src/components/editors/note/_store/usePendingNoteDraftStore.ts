import { create } from 'zustand';

import { registerStore } from '@/store/lifecycle';

import type { CustomBlockNoteEditor } from '../CustomBlockNote/registry/noteEditorComposition';

export interface PendingNoteDraft {
  blocks: CustomBlockNoteEditor['document'];
  focusBody: boolean;
  selection: { from: number; to: number };
}
interface PendingNoteDraftState {
  pendingByResourceId: Record<string, PendingNoteDraft>;
  setDraft(resourceId: string, draft: PendingNoteDraft): void;
  removeDraft(resourceId: string): void;
}
export const usePendingNoteDraftStore = create<PendingNoteDraftState>()((set) => ({
  pendingByResourceId: {},
  setDraft: (resourceId, draft) =>
    set((state) => ({
      pendingByResourceId: { ...state.pendingByResourceId, [resourceId]: draft },
    })),
  removeDraft: (resourceId) =>
    set((state) => {
      const pendingByResourceId = { ...state.pendingByResourceId };
      delete pendingByResourceId[resourceId];
      return { pendingByResourceId };
    }),
}));
registerStore({
  id: 'note-ui.pending-draft',
  scope: 'tab',
  reset: () => usePendingNoteDraftStore.setState({ pendingByResourceId: {} }),
});
