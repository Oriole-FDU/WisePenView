import { createExtension } from '@blocknote/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

import type { NoteEditorExtension } from '../../registry/types';

export interface NoteEmojiPickerSession {
  from: number;
  to: number;
  anchor: DOMRect;
}

type NoteEmojiPluginMeta = { type: 'OPEN'; session: NoteEmojiPickerSession } | { type: 'CLOSE' };

export const noteEmojiPluginKey = new PluginKey<NoteEmojiPickerSession | null>('noteEmojiPicker');

export function createNoteEmojiAnchor(view: EditorView, position: number): DOMRect {
  const coords = view.coordsAtPos(position);
  return new DOMRect(
    coords.left,
    coords.top,
    coords.right - coords.left,
    coords.bottom - coords.top
  );
}

function dispatchMeta(view: EditorView, meta: NoteEmojiPluginMeta): void {
  view.dispatch(view.state.tr.setMeta(noteEmojiPluginKey, meta).setMeta('addToHistory', false));
}

export function openNoteEmojiPicker(view: EditorView): void {
  const { from, to } = view.state.selection;
  dispatchMeta(view, {
    type: 'OPEN',
    session: {
      from,
      to,
      anchor: createNoteEmojiAnchor(view, to),
    },
  });
}

export function closeNoteEmojiPicker(view: EditorView): void {
  if (noteEmojiPluginKey.getState(view.state) === null) return;
  dispatchMeta(view, { type: 'CLOSE' });
}

export function insertNoteEmoji(view: EditorView, emoji: string): void {
  const session = noteEmojiPluginKey.getState(view.state);
  if (!session) return;

  const tr = view.state.tr.insertText(emoji, session.from, session.to);
  tr.setSelection(TextSelection.create(tr.doc, session.from + emoji.length));
  tr.setMeta(noteEmojiPluginKey, { type: 'CLOSE' } satisfies NoteEmojiPluginMeta);
  view.dispatch(tr);
  view.focus();
}

function createEmojiExtension() {
  return createExtension({
    key: 'noteEmojiPicker',
    prosemirrorPlugins: [
      new Plugin<NoteEmojiPickerSession | null>({
        key: noteEmojiPluginKey,
        state: {
          init: () => null,
          apply: (tr, previous) => {
            const meta: NoteEmojiPluginMeta | undefined = tr.getMeta(noteEmojiPluginKey);
            if (!meta) return previous;
            return meta.type === 'OPEN' ? meta.session : null;
          },
        },
      }),
    ],
  });
}

export const emojiEditorExtension = {
  id: 'emoji.extension',
  extensions: () => [createEmojiExtension()],
} satisfies NoteEditorExtension;
