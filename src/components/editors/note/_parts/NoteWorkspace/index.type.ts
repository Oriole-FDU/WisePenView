import type { NoteInfoDisplayData } from '@/domains/Note';

export interface NoteWorkspaceProps {
  resourceId: string;
  noteInfoDisplay: NoteInfoDisplayData;
  onRefreshNoteInfo: () => unknown | Promise<unknown>;
}
