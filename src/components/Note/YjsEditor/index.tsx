import React, { forwardRef } from 'react';

import NoteYjsBlockNote from '../YjsBlockNote';
import type { NoteYjsEditorHandle, NoteYjsEditorProps } from './index.type';
import { useCursorColor } from './useCursorColor';
import { usePrepareConnection } from './usePrepareConnection';
import styles from './style.module.less';

const NoteYjsEditor = forwardRef<NoteYjsEditorHandle, NoteYjsEditorProps>(
  ({ resourceId, userId, onSessionReady, onSessionError, onSessionStatusChange }, ref) => {
    // 准备YJS文档和Provider
    const { doc, provider } = usePrepareConnection({
      resourceId,
      userId,
      onSessionReady,
      onSessionError,
      onSessionStatusChange,
    });

    /** 必须在任何 early return 之前调用，否则会违反 Hooks 规则 */
    const cursorColor = useCursorColor(userId, resourceId);

    // 返回null，顶层组件如果发现NoteYjsEditor返回null，则不渲染子组件，避免渲染一个未就绪的组件
    if (!doc || !provider) {
      return null;
    }

    // 确保doc和provider都准备好了，才渲染子组件
    return (
      <div className={styles.root}>
        <NoteYjsBlockNote
          ref={ref}
          doc={doc}
          provider={provider}
          userId={userId}
          cursorColor={cursorColor}
        />
      </div>
    );
  }
);

NoteYjsEditor.displayName = 'NoteYjsEditor';

export default NoteYjsEditor;
