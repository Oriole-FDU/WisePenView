import React, { useCallback } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

import type { NoteChange } from '@/types/note';
import type { NoteProps } from './index.type';
import styles from './style.module.less';

const Note: React.FC<NoteProps> = ({ pipeline }) => {
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
      const changes: NoteChange[] = raw.map((c) => ({
        type: c.type as NoteChange['type'],
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

export default Note;
