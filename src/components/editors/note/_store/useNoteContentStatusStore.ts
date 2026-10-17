import { create } from 'zustand';

import { registerStore } from '@/store/lifecycle';

export type NoteContentPresence = 'unknown' | 'empty' | 'nonempty';

export interface NoteContentStatus {
  title: NoteContentPresence;
  body: NoteContentPresence;
}

interface NoteContentStatusState {
  statusByResourceId: Record<string, NoteContentStatus>;
  reportTitleStatus: (resourceId: string, status: NoteContentPresence) => void;
  reportBodyStatus: (resourceId: string, status: NoteContentPresence) => void;
  markCreatedEmptyNote: (resourceId: string) => void;
  clearNoteContentStatus: (resourceId: string) => void;
}

const DEFAULT_NOTE_CONTENT_STATUS_STATE = {
  statusByResourceId: {} as Record<string, NoteContentStatus>,
};

const UNKNOWN_NOTE_CONTENT_STATUS: NoteContentStatus = {
  title: 'unknown',
  body: 'unknown',
};

export const useNoteContentStatusStore = create<NoteContentStatusState>()((set) => ({
  ...DEFAULT_NOTE_CONTENT_STATUS_STATE,

  reportTitleStatus: (resourceId, status) =>
    set((state) => {
      const current = state.statusByResourceId[resourceId] ?? UNKNOWN_NOTE_CONTENT_STATUS;
      if (current.title === status) return state;
      return {
        statusByResourceId: {
          ...state.statusByResourceId,
          [resourceId]: { ...current, title: status },
        },
      };
    }),

  reportBodyStatus: (resourceId, status) =>
    set((state) => {
      const current = state.statusByResourceId[resourceId] ?? UNKNOWN_NOTE_CONTENT_STATUS;
      if (current.body === status) return state;
      return {
        statusByResourceId: {
          ...state.statusByResourceId,
          [resourceId]: { ...current, body: status },
        },
      };
    }),

  markCreatedEmptyNote: (resourceId) =>
    set((state) => ({
      statusByResourceId: {
        ...state.statusByResourceId,
        [resourceId]: { title: 'empty', body: 'empty' },
      },
    })),

  clearNoteContentStatus: (resourceId) =>
    set((state) => {
      if (!state.statusByResourceId[resourceId]) return state;
      const statusByResourceId = { ...state.statusByResourceId };
      delete statusByResourceId[resourceId];
      return { statusByResourceId };
    }),
}));

/** 只有标题和正文都已确认是空内容时，才允许侧栏跳过重复创建。 */
export function isNoteContentStatusEmpty(status: NoteContentStatus | undefined): boolean {
  return status?.title === 'empty' && status.body === 'empty';
}

const resetNoteContentStatusStore = (): void => {
  useNoteContentStatusStore.setState(DEFAULT_NOTE_CONTENT_STATUS_STATE);
};

registerStore({
  id: 'note-ui.content-status',
  scope: 'tab',
  reset: resetNoteContentStatusStore,
});
