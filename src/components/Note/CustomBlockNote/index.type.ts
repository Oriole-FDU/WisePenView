import type { Doc } from 'yjs';

import type { WisepenProvider } from '@/services/Note/yjs/WisepenProvider';

export interface CustomBlockNoteProps {
  resourceId: string;
  doc: Doc;
  provider: WisepenProvider;
  userId: string;
  cursorColor: string;
}
