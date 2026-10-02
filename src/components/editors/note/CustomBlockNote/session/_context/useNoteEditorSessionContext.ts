import { useRequiredContext } from '@/hooks/useRequiredContext';

import { NoteEditorSessionContext } from './NoteEditorSessionContext';

export function useNoteEditorSessionContext() {
  return useRequiredContext(NoteEditorSessionContext, 'NoteEditorSession');
}
