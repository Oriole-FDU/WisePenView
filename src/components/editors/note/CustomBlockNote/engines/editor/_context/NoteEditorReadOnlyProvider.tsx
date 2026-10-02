import type { ReactNode } from 'react';

import { NoteEditorReadOnlyContext } from './NoteEditorReadOnlyContext';

export function NoteEditorReadOnlyProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: boolean;
}) {
  return (
    <NoteEditorReadOnlyContext.Provider value={value}>
      {children}
    </NoteEditorReadOnlyContext.Provider>
  );
}
