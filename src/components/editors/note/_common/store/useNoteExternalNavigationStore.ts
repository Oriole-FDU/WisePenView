import { create } from 'zustand';

import {
  createNoteExternalNavigationRequest,
  type NoteExternalNavigationRequest,
} from '@/components/editors/note/_common/noteExternalNavigationModel';
import type { NoteLinkTarget } from '@/components/editors/note/_common/noteLinkProtocol';
import { registerStore } from '@/store/lifecycle';

interface NoteExternalNavigationState {
  /** 待消费的定位请求；仅保存最近一次，新请求覆盖旧请求 */
  pending: NoteExternalNavigationRequest | null;
  requestIdSeed: number;
  requestExternalNavigation: (target: NoteLinkTarget) => NoteExternalNavigationRequest;
  /** 只清除指定请求，避免旧笔记卸载时清掉新请求 */
  consumeExternalNavigation: (requestId: number) => void;
}

const DEFAULT_NOTE_EXTERNAL_NAVIGATION_STATE = {
  pending: null as NoteExternalNavigationRequest | null,
  requestIdSeed: 0,
};

export const useNoteExternalNavigationStore = create<NoteExternalNavigationState>()((set, get) => ({
  ...DEFAULT_NOTE_EXTERNAL_NAVIGATION_STATE,

  requestExternalNavigation: (target) => {
    const request = createNoteExternalNavigationRequest(
      target,
      get().requestIdSeed + 1,
      Date.now()
    );
    set({ pending: request, requestIdSeed: request.requestId });
    return request;
  },

  consumeExternalNavigation: (requestId) =>
    set((state) => (state.pending?.requestId === requestId ? { pending: null } : state)),
}));

const resetNoteExternalNavigationStore = (): void => {
  useNoteExternalNavigationStore.setState(DEFAULT_NOTE_EXTERNAL_NAVIGATION_STATE);
};

registerStore({
  id: 'note-ui.external-navigation',
  scope: 'tab',
  reset: resetNoteExternalNavigationStore,
});
