import React, { useCallback } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

import type { EditorChange } from '@/types/editor';
import type { EditorProps } from './index.type';
import styles from './style.module.less';

const Editor: React.FC<EditorProps> = ({ pipeline }) => {
  const editor = useCreateBlockNote({
    trailingBlock: false,
  });

  const handleChange = useCallback(
    (
      _editor: unknown,
      ctx: {
        getChanges: () => Array<{ type: string; block: { id: string } & Record<string, unknown> }>;
      }
    ) => {
      const raw = ctx.getChanges();
      const changes: EditorChange[] = raw.map((c) => ({
        type: c.type as EditorChange['type'],
        block: c.block,
      }));
      pipeline.refresh(changes);
    },
    [pipeline]
  );

  return (
    <div className={styles.editorWrapper}>
      <BlockNoteView editor={editor} onChange={handleChange} theme="light" />
    </div>
  );
};

export default Editor;
