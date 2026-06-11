import { create } from 'zustand';

import {
  DEFAULT_COMMENTS_SIDEBAR_WIDTH,
  normalizeCommentsSidebarWidth,
} from './noteCommentsSidebarConfig';

interface NoteCommentsSidebarState {
  /** key 为笔记 resourceId */
  collapsedByResourceId: Record<string, boolean>;
  widthByResourceId: Record<string, number>;
  setNoteCommentsSidebarCollapsed: (resourceId: string, collapsed: boolean) => void;
  toggleNoteCommentsSidebarCollapsed: (resourceId: string) => void;
  setNoteCommentsSidebarWidth: (resourceId: string, width: number) => void;
  getNoteCommentsSidebarWidth: (resourceId: string) => number;
}

export const useNoteCommentsSidebarStore = create<NoteCommentsSidebarState>((set, get) => ({
  collapsedByResourceId: {},
  widthByResourceId: {},
  setNoteCommentsSidebarCollapsed: (resourceId, collapsed) =>
    set((state) => {
      if ((state.collapsedByResourceId[resourceId] ?? false) === collapsed) {
        return state;
      }
      return {
        collapsedByResourceId: { ...state.collapsedByResourceId, [resourceId]: collapsed },
      };
    }),
  toggleNoteCommentsSidebarCollapsed: (resourceId) => {
    const cur = get().collapsedByResourceId[resourceId] ?? false;
    get().setNoteCommentsSidebarCollapsed(resourceId, !cur);
  },
  setNoteCommentsSidebarWidth: (resourceId, width) => {
    const normalizedWidth = normalizeCommentsSidebarWidth(width);
    set((state) => {
      if (
        (state.widthByResourceId[resourceId] ?? DEFAULT_COMMENTS_SIDEBAR_WIDTH) === normalizedWidth
      ) {
        return state;
      }
      return {
        widthByResourceId: { ...state.widthByResourceId, [resourceId]: normalizedWidth },
      };
    });
  },
  getNoteCommentsSidebarWidth: (resourceId) =>
    get().widthByResourceId[resourceId] ?? DEFAULT_COMMENTS_SIDEBAR_WIDTH,
}));

export const clearNoteCommentsSidebarStore = (): void => {
  useNoteCommentsSidebarStore.setState({ collapsedByResourceId: {}, widthByResourceId: {} });
};
