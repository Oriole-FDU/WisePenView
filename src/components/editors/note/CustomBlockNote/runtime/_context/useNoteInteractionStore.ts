import { useStore } from 'zustand';

import { useRequiredContext } from '@/hooks/useRequiredContext';

import type { NoteInteractionStoreState } from '../noteInteractionStore';
import { NoteInteractionStoreContext } from './NoteInteractionStoreContext';

export function useNoteInteractionStoreApi() {
  return useRequiredContext(NoteInteractionStoreContext);
}

export function useNoteInteractionStore<T>(selector: (state: NoteInteractionStoreState) => T): T {
  return useStore(useNoteInteractionStoreApi(), selector);
}
