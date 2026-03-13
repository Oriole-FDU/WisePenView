import React, { useCallback, useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import type { Block as BlockNoteBlock } from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

import type { NoteChange } from '@/types/note';
import type { NoteProps } from './index.type';
import styles from './style.module.less';

const Note: React.FC<NoteProps> = ({ pipeline, initialBlocks }) => {
  // 转换为 BlockNote 格式（如果需要）
  const initialContent = useMemo(() => {
    if (!initialBlocks || initialBlocks.length === 0) return undefined;
    return initialBlocks as unknown as BlockNoteBlock[];
  }, [initialBlocks]);

  const editor = useCreateBlockNote({
    trailingBlock: false,
    initialContent,
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
