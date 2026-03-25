import type { Doc } from 'yjs';

import type { WisepenProvider } from '@/services/Note/yjs/WisepenProvider';

export interface NoteYjsBlockNoteProps {
  doc: Doc;
  provider: WisepenProvider;
  userId: string;
  cursorColor: string;
}
