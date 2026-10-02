import type { CustomBlockNoteEditor } from '../../registry/noteEditorComposition';

export type NoteBlock = ReturnType<CustomBlockNoteEditor['getTextCursorPosition']>['block'];
export type NoteBlockUpdate = Parameters<CustomBlockNoteEditor['updateBlock']>[1];
export type NotePartialBlock = Parameters<CustomBlockNoteEditor['insertBlocks']>[0][number];

export { isRecord } from '@/utils/type/typeGuards';

export function toBlockUpdate(update: {
  type?: string;
  props?: Record<string, unknown>;
  content?: unknown;
}): NoteBlockUpdate {
  return update as NoteBlockUpdate;
}
