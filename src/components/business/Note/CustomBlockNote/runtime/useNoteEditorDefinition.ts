import type { Dictionary } from '@blocknote/core';
import { en, zh } from '@blocknote/core/locales';
import type { useCreateBlockNote } from '@blocknote/react';
import { useMemoizedFn } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getAiContentStore } from '../engines/aiDiff/store';
import { useNoteYjsFragment } from '../engines/collaboration/useNoteYjsUndoStack';
import { createNoteReadOnlyFilterExtension } from '../engines/editor/readOnly';
import { createInlineCommentExtension } from '../engines/inlineComments/extension';
import {
  blockNoteSchema,
  collectNoteEditorExtensions,
  collectNoteEditorProps,
  notePluginRegistry,
} from '../registry/noteEditorComposition';
import type { NoteCollaborationUser, NoteEditorRuntimeProps } from '../runtime/runtime.type';

type CreateBlockNoteOptions = NonNullable<Parameters<typeof useCreateBlockNote>[0]>;
type BlockNoteCollaborationConfig = NonNullable<CreateBlockNoteOptions['collaboration']>;
type NotePasteHandler = NonNullable<CreateBlockNoteOptions['pasteHandler']>;
type NoteUploadFile = NonNullable<CreateBlockNoteOptions['uploadFile']>;

const NOTE_EDITOR_PROPS = collectNoteEditorProps(notePluginRegistry);
const BLOCKNOTE_CLIPBOARD_HTML = 'blocknote/html';

function buildNoteDictionary(language: string | undefined): Dictionary {
  const dictionary = language === 'en-US' ? en : zh;
  const slashCommandPlaceholder = dictionary.placeholders.default;

  return {
    ...dictionary,
    placeholders: {
      ...dictionary.placeholders,
      default: undefined,
      emptyDocument: slashCommandPlaceholder,
    },
  };
}

function isDarkHexColor(color: string): boolean {
  const hex = color.startsWith('#') ? color.slice(1, 7) : color.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return true;

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const [r, g, b] = [red, green, blue].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b <= 0.179;
}

function renderNoteCollaborationCursor(user: NoteCollaborationUser): HTMLElement {
  const color = user.color;
  const foreground = isDarkHexColor(color) ? 'white' : 'black';
  const cursor = document.createElement('span');
  const caret = document.createElement('span');
  const label = document.createElement('span');

  cursor.classList.add('wise-note-collaboration-cursor');
  caret.classList.add('wise-note-collaboration-cursor__caret');
  label.classList.add('wise-note-collaboration-cursor__label');

  caret.contentEditable = 'false';
  caret.style.backgroundColor = color;
  caret.style.color = foreground;
  label.style.backgroundColor = color;
  label.style.color = foreground;
  label.textContent = user.name;

  caret.append(label);
  cursor.append(document.createTextNode('\u2060'), caret, document.createTextNode('\u2060'));

  return cursor;
}

function htmlRepresentsOnlyParagraphBlocks(html: string) {
  if (!html.trim()) return false;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const contentTypes = Array.from(doc.body.querySelectorAll<HTMLElement>('[data-content-type]'));
  return (
    contentTypes.length > 0 &&
    contentTypes.every((element) => element.dataset.contentType === 'paragraph')
  );
}

function isEmptyTypedInlineBlock(block: { type: string; content?: unknown }) {
  return block.type !== 'paragraph' && Array.isArray(block.content) && block.content.length === 0;
}

function shouldPasteOwnParagraphAsPlainTextIntoEmptyTypedBlock({
  event,
  editor,
}: Pick<Parameters<NotePasteHandler>[0], 'event' | 'editor'>) {
  const text = event.clipboardData?.getData('text/plain');
  if (!text) return false;

  const currentBlock = editor.getTextCursorPosition().block;
  if (!isEmptyTypedInlineBlock(currentBlock)) return false;

  const internalHtml = event.clipboardData?.getData(BLOCKNOTE_CLIPBOARD_HTML);
  return htmlRepresentsOnlyParagraphBlocks(internalHtml ?? '');
}

const handlePasteIntoNote: NotePasteHandler = ({ event, editor, defaultPasteHandler }) => {
  if (shouldPasteOwnParagraphAsPlainTextIntoEmptyTypedBlock({ event, editor })) {
    editor.pasteText(event.clipboardData?.getData('text/plain') ?? '');
    return true;
  }

  return defaultPasteHandler();
};

export function useNoteEditorDefinition(
  {
    collaboration: { doc, provider, user: collaborationUser },
    state: { blockLocalDocWrites },
    inlineComments,
  }: NoteEditorRuntimeProps,
  {
    uploadFile,
  }: {
    uploadFile: NoteUploadFile;
  }
) {
  const { i18n } = useTranslation('note');
  const [pmWriteGuardReady, setPmWriteGuardReady] = useState(false);
  const shouldBlockLocalDocWrites = useMemoizedFn(() => blockLocalDocWrites && pmWriteGuardReady);
  const hasBlockLocalDocWritesProp = useMemoizedFn(() => blockLocalDocWrites);
  const noteFragment = useNoteYjsFragment(doc);
  const aiContentStore = getAiContentStore(doc);

  const editorExtensions = [
    ...collectNoteEditorExtensions(notePluginRegistry),
    ...(inlineComments
      ? [
          createInlineCommentExtension({
            fragment: noteFragment,
            registry: notePluginRegistry,
            session: inlineComments.session,
            onThreadSelect: inlineComments.onThreadSelect ?? (() => undefined),
          }),
        ]
      : []),
    createNoteReadOnlyFilterExtension(shouldBlockLocalDocWrites),
  ];

  return {
    editorOptions: {
      schema: blockNoteSchema,
      dictionary: buildNoteDictionary(i18n.resolvedLanguage),
      trailingBlock: true,
      dropCursor: {
        color: 'var(--accent)',
        width: 2,
      },
      disableExtensions: ['history', 'yUndo'],
      uploadFile,
      pasteHandler: handlePasteIntoNote,
      extensions: editorExtensions,
      _tiptapOptions: {
        editorProps: NOTE_EDITOR_PROPS,
      },
      collaboration: {
        provider: provider as BlockNoteCollaborationConfig['provider'],
        fragment: noteFragment,
        user: collaborationUser,
        renderCursor: renderNoteCollaborationCursor,
        showCursorLabels: 'always',
      },
    } satisfies CreateBlockNoteOptions,
    noteFragment,
    aiContentStore,
    hasBlockLocalDocWritesProp,
    setPmWriteGuardReady,
  };
}

export type NoteEditorDefinition = ReturnType<typeof useNoteEditorDefinition>;
