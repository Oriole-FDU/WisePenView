import React, { forwardRef, useImperativeHandle, useRef } from 'react';

import CustomBlockNote from '../CustomBlockNote';
import type { NoteEditorHandle, NoteEditorProps } from './index.type';
import styles from './style.module.less';

const Editor = forwardRef<NoteEditorHandle, NoteEditorProps>(
  ({ resourceId, doc, provider }, ref) => {
    const blockNoteRef = useRef<NoteEditorHandle>(null);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          blockNoteRef.current?.focus();
        },
        retrySession: () => {
          provider.disconnect();
          provider.connect();
        },
      }),
      [provider]
    );

    return (
      <div className={styles.root}>
        <CustomBlockNote ref={blockNoteRef} resourceId={resourceId} doc={doc} provider={provider} />
      </div>
    );
  }
);

Editor.displayName = 'Editor';

export default Editor;
