import type { Doc } from 'yjs';

import type { NoteYjsSocket } from '@/connection/plugins/note';

export interface CustomBlockNoteProps {
  resourceId: string;
  doc: Doc;
  provider: NoteYjsSocket;
}
