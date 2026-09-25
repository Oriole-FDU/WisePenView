import { useContext } from 'react';

import { NoteEditorReadOnlyContext } from './NoteEditorReadOnlyContext';

export function useNoteEditorReadOnlyContext(): boolean {
  return useContext(NoteEditorReadOnlyContext);
}
