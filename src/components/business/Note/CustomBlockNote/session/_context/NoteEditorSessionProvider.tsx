import type { ReactNode } from 'react';

import { NoteEditorSessionContext, type NoteEditorSessionValue } from './NoteEditorSessionContext';

export function NoteEditorSessionProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: NoteEditorSessionValue;
}) {
  return (
    <NoteEditorSessionContext.Provider value={value}>{children}</NoteEditorSessionContext.Provider>
  );
}
