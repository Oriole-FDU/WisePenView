import { create } from 'zustand';

import { registerStore } from '@/store/lifecycle';

import { type MyNote } from '../localNoteModel';

interface MyNotesState {
  notes: MyNote[];
  expanded: boolean;
  creating: boolean;
  add: (resourceId: string, name: string, eligible?: boolean) => void;
  update: (resourceId: string, patch: Partial<MyNote>) => void;
  reveal: (resourceId: string) => void;
}

// 仅保存本标签页已打开笔记的元数据；正文仍由现有编辑器保存，会话结束清空。
export const useMyNotesStore = create<MyNotesState>((set) => ({
  notes: [],
  expanded: false,
  creating: false,
  add: (resourceId, name, eligible = false) =>
    set((state) =>
      state.notes.some((note) => note.resourceId === resourceId)
        ? {
            notes: state.notes.map((note) =>
              note.resourceId === resourceId && note.name !== name ? { ...note, name } : note
            ),
          }
        : {
            notes: [
              {
                resourceId,
                name,
                defaultName: name,
                createdAt: Date.now(),
                hasBody: !eligible,
                hasTitle: false,
                eligible,
              },
              ...state.notes,
            ],
          }
    ),
  update: (resourceId, patch) =>
    set((state) => {
      const current = state.notes.find((note) => note.resourceId === resourceId);
      if (
        !current ||
        Object.entries(patch).every(([key, value]) => current[key as keyof MyNote] === value)
      )
        return state;
      return {
        notes: state.notes.map((note) =>
          note.resourceId === resourceId ? { ...note, ...patch } : note
        ),
      };
    }),
  reveal: (resourceId) =>
    set((state) => ({
      expanded: true,
      notes: [
        ...state.notes.filter((note) => note.resourceId === resourceId),
        ...state.notes.filter((note) => note.resourceId !== resourceId),
      ],
    })),
}));

registerStore({
  id: 'resource.my-notes',
  scope: 'tab',
  reset: () => useMyNotesStore.setState({ notes: [], expanded: false, creating: false }),
});
