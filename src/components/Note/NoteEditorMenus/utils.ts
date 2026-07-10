import type { CustomBlockNoteEditor } from '../CustomBlockNote/blockNoteSchema';

export type NoteBlock = ReturnType<CustomBlockNoteEditor['getTextCursorPosition']>['block'];
export type NoteBlockUpdate = Parameters<CustomBlockNoteEditor['updateBlock']>[1];
export type NotePartialBlock = Parameters<CustomBlockNoteEditor['insertBlocks']>[0][number];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function toBlockUpdate(update: {
  type?: string;
  props?: Record<string, unknown>;
  content?: unknown;
}): NoteBlockUpdate {
  return update as NoteBlockUpdate;
}
