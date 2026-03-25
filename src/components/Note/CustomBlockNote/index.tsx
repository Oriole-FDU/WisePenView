import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { SuggestionMenuController, useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { zh } from '@blocknote/core/locales';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

import { NOTE_YJS_DOCUMENT_FRAGMENT } from '@/services/Note/yjs';
import { useImageService } from '@/contexts/ServicesContext';

import type { NoteEditorHandle } from '../NoteEditor/index.type';
import type { CustomBlockNoteProps } from './index.type';
import { useNoteCaptureKeyEvent } from '../NoteEditor/useNoteCaptureKeyEvent';
import { buildNoteSlashMenuItems } from './slashMenuConfig';
import styles from './style.module.less';

type CreateBlockNoteOptions = NonNullable<Parameters<typeof useCreateBlockNote>[0]>;
type BlockNoteCollaborationConfig = NonNullable<CreateBlockNoteOptions['collaboration']>;

// CustomBlockNote 组件是 NoteEditor 的子组件，用于创建 BlockNote 实例并接入 YJS 协同连接
const CustomBlockNote = forwardRef<NoteEditorHandle, CustomBlockNoteProps>(
  ({ resourceId, doc, provider, userId, cursorColor }, ref) => {
    const imageService = useImageService();

    const uploadFile = useCallback(
      async (file: File) => {
        // 只拦截图片：非图片文件让 BlockNote 走默认行为（或抛错以阻止插入）
        if (!file.type.startsWith('image/')) {
          throw new Error('仅支持插入图片文件');
        }
        const { publicUrl } = await imageService.uploadImage({
          file,
          isPublic: true,
          bizPath: `notes/${resourceId}`,
        });
        return publicUrl;
      },
      [imageService, resourceId]
    );

    const editor = useCreateBlockNote({
      dictionary: zh,
      trailingBlock: false,
      uploadFile,
      collaboration: {
        provider: provider as BlockNoteCollaborationConfig['provider'],
        fragment: doc.getXmlFragment(NOTE_YJS_DOCUMENT_FRAGMENT),
        user: {
          name: userId,
          color: cursorColor,
        },
      },
    });

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          editor.focus();
        },
      }),
      [editor]
    );

    const onKeyDownCapture = useNoteCaptureKeyEvent(provider);

    return (
      <div className={styles.editorShell} onKeyDownCapture={onKeyDownCapture}>
        <BlockNoteView editor={editor} theme="light" filePanel={false} slashMenu={false}>
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) => {
              return filterSuggestionItems(buildNoteSlashMenuItems(editor), query);
            }}
          />
        </BlockNoteView>
      </div>
    );
  }
);

CustomBlockNote.displayName = 'CustomBlockNote';

export default CustomBlockNote;
