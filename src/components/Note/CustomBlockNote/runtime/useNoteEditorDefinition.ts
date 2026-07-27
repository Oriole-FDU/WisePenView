import { useImageService } from '@/domains';
import { assertImageProxyUploadLimit } from '@/domains/Image';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
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
import type { CustomBlockNoteProps } from '../index.type';
import {
  blockNoteSchema,
  collectNoteEditorExtensions,
  collectNoteEditorProps,
  notePluginRegistry,
} from '../registry/noteEditorComposition';

type CreateBlockNoteOptions = NonNullable<Parameters<typeof useCreateBlockNote>[0]>;
type BlockNoteCollaborationConfig = NonNullable<CreateBlockNoteOptions['collaboration']>;

const NOTE_EDITOR_PROPS = collectNoteEditorProps(notePluginRegistry);

export function useNoteEditorDefinition({
  resourceId,
  collaboration: { doc, provider, user: collaborationUser },
  state: { readOnly, blockLocalDocWrites },
  inlineComments,
}: CustomBlockNoteProps) {
  const { i18n } = useTranslation('note');
  const imageService = useImageService();
  const [pmWriteGuardReady, setPmWriteGuardReady] = useState(false);
  const shouldBlockLocalDocWrites = useMemoizedFn(() => blockLocalDocWrites && pmWriteGuardReady);
  const hasBlockLocalDocWritesProp = useMemoizedFn(() => blockLocalDocWrites);
  const noteFragment = useNoteYjsFragment(doc);
  const aiContentStore = getAiContentStore(doc);

  const uploadFile = useMemoizedFn(async (file: File) => {
    if (readOnly) {
      const err = createClientError(FRONTEND_CLIENT_ERROR.NOTE_READ_ONLY_IMAGE_UPLOAD);
      toast.danger(parseErrorMessage(err));
      throw err;
    }
    if (!file.type.startsWith('image/')) {
      throw createClientError(FRONTEND_CLIENT_ERROR.IMAGE_ONLY);
    }
    try {
      assertImageProxyUploadLimit(file);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
      throw error;
    }
    const { publicUrl } = await imageService.uploadImage({
      file,
      scene: 'PRIVATE_IMAGE_FOR_NOTE',
      bizTag: `notes/${resourceId}`,
    });
    return publicUrl;
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
      dictionary: i18n.resolvedLanguage === 'en-US' ? en : zh,
      trailingBlock: true,
      disableExtensions: ['history', 'yUndo'],
      uploadFile,
      extensions: editorExtensions,
      _tiptapOptions: {
        editorProps: NOTE_EDITOR_PROPS,
      },
      collaboration: {
        provider: provider as BlockNoteCollaborationConfig['provider'],
        fragment: noteFragment,
        user: collaborationUser,
      },
    } satisfies CreateBlockNoteOptions,
    noteFragment,
    aiContentStore,
    hasBlockLocalDocWritesProp,
    setPmWriteGuardReady,
  };
}

export type NoteEditorDefinition = ReturnType<typeof useNoteEditorDefinition>;
