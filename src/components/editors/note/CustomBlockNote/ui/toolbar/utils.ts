import type { MouseEvent as ReactMouseEvent } from 'react';

import type { CustomBlockNoteEditor } from '../../registry/noteEditorComposition';
import type { NoteBlock } from '../editorMenus/utils';
export {
  isRecord,
  type NoteBlock,
  type NoteBlockUpdate,
  toBlockUpdate,
} from '../editorMenus/utils';

type NoteStyleUpdate = Parameters<CustomBlockNoteEditor['addStyles']>[0];

export function stopToolbarMouseDown(event: ReactMouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

export function blockHasInlineContent(block: NoteBlock): boolean {
  return block.content !== undefined;
}

export function getSelectedBlocks(editor: CustomBlockNoteEditor): NoteBlock[] {
  try {
    return editor.getSelection()?.blocks ?? [editor.getTextCursorPosition().block];
  } catch {
    return [];
  }
}

function getSchemaStyleRecord(editor: CustomBlockNoteEditor) {
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
