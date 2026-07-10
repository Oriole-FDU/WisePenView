import { create } from 'zustand';

export type SelectedNoteScope =
  | {
      type: 'blocks';
      block_ids: string[];
      include_children?: boolean;
    }
  | {
      type: 'subtree';
      root_block_id: string;
    }
  | {
      type: 'block_range';
      start_block_id: string;
      end_block_id: string;
      include_partial?: boolean;
    };

type NoteSelectionState = {
  selectedTextByResourceId: Record<string, string>;
  selectedNoteScopeByResourceId: Record<string, SelectedNoteScope>;
  enableSelectedTextByResourceId: Record<string, true>;
  setSelectedText: (resourceId: string, selectedText: string) => void;
  setSelectedNoteScope: (resourceId: string, scope: SelectedNoteScope | null) => void;
  setSelectedTextAndScope: (
    resourceId: string,
    selectedText: string,
    scope: SelectedNoteScope | null
  ) => void;
  setEnableSelectedText: (resourceId: string, enabled: boolean) => void;
  clearSelectedText: (resourceId: string) => void;
};

const DEFAULT_NOTE_SELECTION_STATE = {
  selectedTextByResourceId: {} as Record<string, string>,
  selectedNoteScopeByResourceId: {} as Record<string, SelectedNoteScope>,
  enableSelectedTextByResourceId: {} as Record<string, true>,
};

export const useNoteSelectionStore = create<NoteSelectionState>()((set) => ({
  ...DEFAULT_NOTE_SELECTION_STATE,

  setSelectedText: (resourceId, selectedText) =>
    set((state) => {
      const nextText = selectedText;
      const isEnableSelectedText = Boolean(state.enableSelectedTextByResourceId[resourceId]);
      if (isEnableSelectedText && nextText.trim() === '') {
        return state;
      }
      if (state.selectedTextByResourceId[resourceId] === selectedText) {
        return state;
      }
      return {
        selectedTextByResourceId: {
          ...state.selectedTextByResourceId,
          [resourceId]: nextText,
        },
      };
    }),

  setSelectedNoteScope: (resourceId, scope) =>
    set((state) => {
      const nextSelectedNoteScopeByResourceId = { ...state.selectedNoteScopeByResourceId };
      const previous = state.selectedNoteScopeByResourceId[resourceId];
      if (scope == null) {
        if (previous == null) {
          return state;
        }
        delete nextSelectedNoteScopeByResourceId[resourceId];
      } else {
        const previousJson = previous ? JSON.stringify(previous) : '';
        const nextJson = JSON.stringify(scope);
        if (previousJson === nextJson) {
          return state;
        }
        nextSelectedNoteScopeByResourceId[resourceId] = scope;
      }
      return {
        selectedNoteScopeByResourceId: nextSelectedNoteScopeByResourceId,
      };
    }),

  setSelectedTextAndScope: (resourceId, selectedText, scope) =>
    set((state) => {
      const nextText = selectedText;
      const isEnableSelectedText = Boolean(state.enableSelectedTextByResourceId[resourceId]);
      if (isEnableSelectedText && nextText.trim() === '') {
        if (scope == null && state.selectedNoteScopeByResourceId[resourceId] != null) {
          const nextSelectedNoteScopeByResourceId = { ...state.selectedNoteScopeByResourceId };
          delete nextSelectedNoteScopeByResourceId[resourceId];
          return {
            selectedNoteScopeByResourceId: nextSelectedNoteScopeByResourceId,
          };
        }
        return state;
      }

      const previousScope = state.selectedNoteScopeByResourceId[resourceId];
      const previousScopeJson = previousScope ? JSON.stringify(previousScope) : '';
      const nextScopeJson = scope ? JSON.stringify(scope) : '';
      const textChanged = state.selectedTextByResourceId[resourceId] !== nextText;
      const scopeChanged = previousScopeJson !== nextScopeJson;
      if (!textChanged && !scopeChanged) {
        return state;
      }

      const nextSelectedNoteScopeByResourceId = { ...state.selectedNoteScopeByResourceId };
      if (scope == null) {
        delete nextSelectedNoteScopeByResourceId[resourceId];
      } else {
        nextSelectedNoteScopeByResourceId[resourceId] = scope;
      }

      return {
        ...(textChanged
          ? {
              selectedTextByResourceId: {
                ...state.selectedTextByResourceId,
                [resourceId]: nextText,
              },
            }
          : {}),
        selectedNoteScopeByResourceId: nextSelectedNoteScopeByResourceId,
      };
    }),

  setEnableSelectedText: (resourceId, enabled) =>
    set((state) => {
      const isEnabled = Boolean(state.enableSelectedTextByResourceId[resourceId]);
      if (enabled === isEnabled) {
        return state;
      }
      const nextEnableSelectedTextByResourceId = { ...state.enableSelectedTextByResourceId };
      if (enabled) {
        nextEnableSelectedTextByResourceId[resourceId] = true;
      } else {
        delete nextEnableSelectedTextByResourceId[resourceId];
      }
      return {
        enableSelectedTextByResourceId: nextEnableSelectedTextByResourceId,
      };
    }),

  clearSelectedText: (resourceId) =>
    set((state) => {
      const hasSelectedText = state.selectedTextByResourceId[resourceId] != null;
      const hasSelectedNoteScope = state.selectedNoteScopeByResourceId[resourceId] != null;
      const hasEnableSelectedText = state.enableSelectedTextByResourceId[resourceId] != null;
      if (!hasSelectedText && !hasSelectedNoteScope && !hasEnableSelectedText) {
        return state;
      }
      const nextSelectedTextByResourceId = { ...state.selectedTextByResourceId };
      delete nextSelectedTextByResourceId[resourceId];
      const nextSelectedNoteScopeByResourceId = { ...state.selectedNoteScopeByResourceId };
      delete nextSelectedNoteScopeByResourceId[resourceId];
      const nextEnableSelectedTextByResourceId = { ...state.enableSelectedTextByResourceId };
      delete nextEnableSelectedTextByResourceId[resourceId];
      return {
        selectedTextByResourceId: nextSelectedTextByResourceId,
        selectedNoteScopeByResourceId: nextSelectedNoteScopeByResourceId,
        enableSelectedTextByResourceId: nextEnableSelectedTextByResourceId,
      };
    }),
}));

export const clearNoteSelectionStore = (): void => {
  useNoteSelectionStore.setState(DEFAULT_NOTE_SELECTION_STATE);
};
