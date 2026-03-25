import React, { forwardRef, useImperativeHandle } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { zh } from '@blocknote/core/locales';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

import { NOTE_YJS_DOCUMENT_FRAGMENT } from '@/services/Note/yjs';

import type { NoteYjsEditorHandle } from '../YjsEditor/index.type';
import type { NoteYjsBlockNoteProps } from './index.type';
import { useNoteCaptureKeyEvent } from '../YjsEditor/useNoteCaptureKeyEvent';
import styles from './style.module.less';

type CreateBlockNoteOptions = NonNullable<Parameters<typeof useCreateBlockNote>[0]>;
type BlockNoteCollaborationConfig = NonNullable<CreateBlockNoteOptions['collaboration']>;

// YjsBlockNote 组件是YjsEditor的子组件，用于创建BlockNote实例，与YJS协同编辑连接
const NoteYjsBlockNote = forwardRef<NoteYjsEditorHandle, NoteYjsBlockNoteProps>(
  ({ doc, provider, userId, cursorColor }, ref) => {
    const editor = useCreateBlockNote({
      dictionary: zh,
      trailingBlock: false,
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
        <BlockNoteView editor={editor} theme="light" />
      </div>
    );
  }
);

NoteYjsBlockNote.displayName = 'NoteYjsBlockNote';

export default NoteYjsBlockNote;
