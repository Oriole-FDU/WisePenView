import { useImageService } from '@/domains';
import { assertImageProxyUploadLimit } from '@/domains/Image';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import type { Dictionary } from '@blocknote/core';
import { en, zh } from '@blocknote/core/locales';
import type { useCreateBlockNote } from '@blocknote/react';
import { toast } from '@heroui/react';
import { useMemoizedFn } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getAiContentStore } from '../engines/aiDiff/store';
import { useNoteYjsFragment } from '../engines/collaboration/useNoteYjsUndoStack';
import { createNoteReadOnlyFilterExtension } from '../engines/editor/readOnly';
import { createInlineCommentExtension } from '../engines/inlineComments/extension';
import type { CustomBlockNoteProps, NoteCollaborationUser } from '../index.type';
import {
  blockNoteSchema,
  collectNoteEditorExtensions,
  collectNoteEditorProps,
  notePluginRegistry,
} from '../registry/noteEditorComposition';

type CreateBlockNoteOptions = NonNullable<Parameters<typeof useCreateBlockNote>[0]>;
type BlockNoteCollaborationConfig = NonNullable<CreateBlockNoteOptions['collaboration']>;
type NotePasteHandler = NonNullable<CreateBlockNoteOptions['pasteHandler']>;

interface NoteImageUploadTracker {
  start: (blockId: string | undefined) => void;
  markFailed: (blockId: string | undefined) => void;
  finish: (blockId: string | undefined) => boolean;
  dispose: () => void;
}

const NOTE_EDITOR_PROPS = collectNoteEditorProps(notePluginRegistry);
const STRUCTURED_CLIPBOARD_TYPES = new Set([
  'blocknote/html',
  'text/markdown',
  'Files',
  'vscode-editor-data',
]);

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

function shouldPastePlainTextIntoEmptyHeading({
  event,
  editor,
}: Pick<Parameters<NotePasteHandler>[0], 'event' | 'editor'>) {
  const text = event.clipboardData?.getData('text/plain');
  if (!text) return false;
  if (event.clipboardData?.types.some((type) => STRUCTURED_CLIPBOARD_TYPES.has(type))) return false;

  const currentBlock = editor.getTextCursorPosition().block;
  return currentBlock.type === 'heading' && Array.isArray(currentBlock.content)
    ? currentBlock.content.length === 0
    : false;
}

const handlePasteIntoNote: NotePasteHandler = ({ event, editor, defaultPasteHandler }) => {
  if (shouldPastePlainTextIntoEmptyHeading({ event, editor })) {
    editor.pasteText(event.clipboardData?.getData('text/plain') ?? '');
    return true;
  }

  return defaultPasteHandler();
};

export function useNoteEditorDefinition({
  resourceId,
  collaboration: { doc, provider, user: collaborationUser },
  state: { readOnly, blockLocalDocWrites },
  inlineComments,
  onImageUploadCountChange,
}: CustomBlockNoteProps) {
  const { i18n } = useTranslation('note');
  const imageService = useImageService();
  const [pmWriteGuardReady, setPmWriteGuardReady] = useState(false);
  const [imageUploadTracker] = useState<NoteImageUploadTracker>(() => {
    const tasks = new Map<string, { failed: boolean }>();
    return {
      start: (blockId) => {
        if (!blockId) return;
        tasks.set(blockId, { failed: false });
        onImageUploadCountChange?.(tasks.size);
      },
      markFailed: (blockId) => {
        if (!blockId) return;
        const task = tasks.get(blockId);
        if (task) task.failed = true;
      },
      finish: (blockId) => {
        if (!blockId) return false;
        const task = tasks.get(blockId);
        if (!task) return false;
        tasks.delete(blockId);
        onImageUploadCountChange?.(tasks.size);
        return task.failed;
      },
      dispose: () => {
        tasks.clear();
        onImageUploadCountChange?.(0);
      },
    };
  });
  const shouldBlockLocalDocWrites = useMemoizedFn(() => blockLocalDocWrites && pmWriteGuardReady);
  const hasBlockLocalDocWritesProp = useMemoizedFn(() => blockLocalDocWrites);
  const noteFragment = useNoteYjsFragment(doc);
  const aiContentStore = getAiContentStore(doc);

  const uploadFile = useMemoizedFn(async (file: File, blockId?: string) => {
    imageUploadTracker.start(blockId);
    try {
      if (readOnly) {
        const err = createClientError(FRONTEND_CLIENT_ERROR.NOTE_READ_ONLY_IMAGE_UPLOAD);
        throw err;
      }
      if (!file.type.startsWith('image/')) {
        throw createClientError(FRONTEND_CLIENT_ERROR.IMAGE_ONLY);
      }
      assertImageProxyUploadLimit(file);
      const { publicUrl } = await imageService.uploadImage({
        file,
        scene: 'PRIVATE_IMAGE_FOR_NOTE',
        bizTag: `notes/${resourceId}`,
      });
      return publicUrl;
    } catch (error) {
      imageUploadTracker.markFailed(blockId);
      toast.danger(parseErrorMessage(error));
      throw error;
    }
  });

  const editorExtensions = [
    ...collectNoteEditorExtensions(notePluginRegistry),
    ...(inlineComments
      ? [
          createInlineCommentExtension({
            fragment: noteFragment,
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
    imageUploadTracker,
    hasBlockLocalDocWritesProp,
    setPmWriteGuardReady,
  };
}

export type NoteEditorDefinition = ReturnType<typeof useNoteEditorDefinition>;
