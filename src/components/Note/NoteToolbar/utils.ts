import type { MouseEvent as ReactMouseEvent } from 'react';
import type { CustomBlockNoteEditor } from '../CustomBlockNote/blockNoteSchema';

export type NoteBlock = ReturnType<CustomBlockNoteEditor['getTextCursorPosition']>['block'];
export type NoteBlockUpdate = Parameters<CustomBlockNoteEditor['updateBlock']>[1];
export type NoteStyleUpdate = Parameters<CustomBlockNoteEditor['addStyles']>[0];

export function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function stopToolbarMouseDown(event: ReactMouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

export function blockHasInlineContent(block: NoteBlock): boolean {
  return block.content !== undefined;
}

export function getSelectedBlocks(editor: CustomBlockNoteEditor): NoteBlock[] {
  return editor.getSelection()?.blocks ?? [editor.getTextCursorPosition().block];
}

export function getSchemaStyleRecord(editor: CustomBlockNoteEditor) {
  return editor.schema.styleSchema as Record<string, { type?: unknown; propSchema?: unknown }>;
}

export function basicStyleExists(editor: CustomBlockNoteEditor, style: string): boolean {
  const schemaStyle = getSchemaStyleRecord(editor)[style];
  return schemaStyle?.type === style && schemaStyle.propSchema === 'boolean';
}

export function colorStyleExists(
  editor: CustomBlockNoteEditor,
  colorType: 'textColor' | 'backgroundColor'
): boolean {
  const schemaStyle = getSchemaStyleRecord(editor)[colorType];
  return schemaStyle?.type === colorType && schemaStyle.propSchema === 'string';
}

export function toStyleUpdate(style: Record<string, string | boolean>): NoteStyleUpdate {
  return style as NoteStyleUpdate;
}

export function toBlockUpdate(update: {
  type?: string;
  props?: Record<string, unknown>;
  content?: unknown;
}): NoteBlockUpdate {
  return update as NoteBlockUpdate;
}
