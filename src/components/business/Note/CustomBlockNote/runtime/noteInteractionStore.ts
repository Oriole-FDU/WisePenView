import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { AiDiffDisplayMode } from '@/domains/Note';
import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { NoteFindResult } from '../index.type';

export type NoteOverlayKind = 'none' | 'emoji' | 'link' | 'color' | 'caption' | 'latex';

export interface NoteInteractionState {
  access: {
    readOnly: boolean;
    blockLocalDocWrites: boolean;
  };
  find: {
    active: boolean;
    query: string;
    replacement: string;
    result: NoteFindResult | null;
    replaced: number;
  };
  review: {
    displayMode: AiDiffDisplayMode;
    selectedChangeKey: string | null;
    hasContent: boolean;
  };
  overlay: {
    kind: NoteOverlayKind;
    targetId?: string;
    phase: 'closed' | 'open';
  };
}

export type NoteInteractionEvent =
  | {
      type: 'ACCESS_CHANGED';
      access: NoteInteractionState['access'];
    }
  | {
      type: 'FIND_OPEN';
      initialQuery?: string;
    }
  | { type: 'FIND_CLOSE' }
  | { type: 'FIND_QUERY_CHANGED'; query: string }
  | { type: 'FIND_REPLACEMENT_CHANGED'; replacement: string }
  | { type: 'FIND_RESULT_CHANGED'; result: NoteFindResult | null }
  | { type: 'FIND_REPLACED'; count: number }
  | {
      type: 'REVIEW_DISPLAY_MODE_CHANGED';
      displayMode: AiDiffDisplayMode;
    }
  | { type: 'REVIEW_CONTENT_CHANGED'; hasContent: boolean }
  | { type: 'REVIEW_SELECTION_CHANGED'; changeKey: string | null }
  | {
      type: 'OVERLAY_OPEN';
      kind: Exclude<NoteOverlayKind, 'none'>;
      targetId?: string;
    }
  | { type: 'OVERLAY_CLOSE' }
  | { type: 'CLOSE_TRANSIENT_UI' };

export interface NoteInteractionStoreState extends NoteInteractionState {
  dispatch: (event: NoteInteractionEvent) => void;
}

export type NoteInteractionStoreApi = StoreApi<NoteInteractionStoreState>;

export const NoteInteractionStoreContext = createContext<NoteInteractionStoreApi | null>(null);

function createInitialState(access: NoteInteractionState['access']): NoteInteractionState {
  return {
    access,
    find: {
      active: false,
      query: '',
      replacement: '',
      result: null,
      replaced: 0,
    },
    review: {
      displayMode: AI_DIFF_DISPLAY_MODE.COMPARE,
      selectedChangeKey: null,
      hasContent: false,
    },
    overlay: {
      kind: 'none',
      phase: 'closed',
    },
  };
}

export function reduceNoteInteractionState(
  state: NoteInteractionState,
  event: NoteInteractionEvent
): NoteInteractionState {
  switch (event.type) {
    case 'ACCESS_CHANGED': {
      if (
        state.access.readOnly === event.access.readOnly &&
        state.access.blockLocalDocWrites === event.access.blockLocalDocWrites
      ) {
        return state;
      }
      const shouldCloseOverlay = event.access.readOnly || event.access.blockLocalDocWrites;
      return {
        ...state,
        access: event.access,
        overlay: shouldCloseOverlay ? { kind: 'none', phase: 'closed' } : state.overlay,
      };
    }
    case 'FIND_OPEN':
      return {
        ...state,
        find: {
          ...state.find,
          active: true,
          query: event.initialQuery ?? state.find.query,
          result: event.initialQuery ? null : state.find.result,
          replaced: 0,
        },
        overlay: { kind: 'none', phase: 'closed' },
      };
    case 'FIND_CLOSE':
      return {
        ...state,
        find: {
          ...state.find,
          active: false,
          query: '',
          replacement: '',
          result: null,
          replaced: 0,
        },
      };
    case 'FIND_QUERY_CHANGED':
      return {
        ...state,
        find: { ...state.find, query: event.query, replaced: 0 },
      };
    case 'FIND_REPLACEMENT_CHANGED':
      return {
        ...state,
        find: { ...state.find, replacement: event.replacement, replaced: 0 },
      };
    case 'FIND_RESULT_CHANGED':
      return {
        ...state,
        find: { ...state.find, result: event.result },
      };
    case 'FIND_REPLACED':
      return {
        ...state,
        find: { ...state.find, replaced: event.count },
      };
    case 'REVIEW_DISPLAY_MODE_CHANGED':
      return {
        ...state,
        review: { ...state.review, displayMode: event.displayMode },
        overlay: { kind: 'none', phase: 'closed' },
      };
    case 'REVIEW_CONTENT_CHANGED':
      return {
        ...state,
        review: { ...state.review, hasContent: event.hasContent },
      };
    case 'REVIEW_SELECTION_CHANGED':
      return {
        ...state,
        review: { ...state.review, selectedChangeKey: event.changeKey },
      };
    case 'OVERLAY_OPEN':
      return {
        ...state,
        find: event.kind === 'latex' ? state.find : { ...state.find, active: false },
        overlay: {
          kind: event.kind,
          targetId: event.targetId,
          phase: 'open',
        },
      };
    case 'OVERLAY_CLOSE':
      return {
        ...state,
        overlay: { kind: 'none', phase: 'closed' },
      };
    case 'CLOSE_TRANSIENT_UI':
      return {
        ...state,
        overlay: { kind: 'none', phase: 'closed' },
      };
  }
}

export function createNoteInteractionStore(
  access: NoteInteractionState['access']
): NoteInteractionStoreApi {
  return createStore<NoteInteractionStoreState>()((set) => ({
    ...createInitialState(access),
    dispatch: (event) =>
      set((state) => ({
        ...reduceNoteInteractionState(state, event),
        dispatch: state.dispatch,
      })),
  }));
}

export function useNoteInteractionStoreApi(): NoteInteractionStoreApi {
  const store = useContext(NoteInteractionStoreContext);
  if (store == null) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'useNoteInteractionStoreApi must be used within NoteInteractionStoreProvider',
    });
  }
  return store;
}

export function useNoteInteractionStore<T>(selector: (state: NoteInteractionStoreState) => T): T {
  return useStore(useNoteInteractionStoreApi(), selector);
}
