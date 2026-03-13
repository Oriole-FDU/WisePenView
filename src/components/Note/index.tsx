import React, { useCallback, useEffect, useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import type { Block as BlockNoteBlock } from '@blocknote/core';
import { zh } from '@blocknote/core/locales';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

import type { NoteChange } from '@/types/note';
import type { NoteProps } from './index.type';
import styles from './style.module.less';

/** 确保首块为 heading 1，空文档时插入占位 heading */
const normalizeFirstBlockAsHeading = (blocks: BlockNoteBlock[] | undefined): BlockNoteBlock[] => {
  const raw =
    blocks && blocks.length > 0
      ? blocks
      : ([
          {
            type: 'heading',
            props: {
              level: 1,
              backgroundColor: 'default',
              textColor: 'default',
              textAlignment: 'left',
            },
            content: [],
            children: [],
          },
        ] as unknown as BlockNoteBlock[]);
  const first = raw[0];
  if (first.type !== 'heading' || (first.props as { level?: number })?.level !== 1) {
    raw[0] = {
      ...first,
      type: 'heading',
      props: { ...first.props, level: 1 },
    } as BlockNoteBlock;
  }
  return raw;
};

const Note: React.FC<NoteProps> = ({ pipeline, initialBlocks }) => {
  const initialContent = useMemo(() => {
    const blocks = initialBlocks as unknown as BlockNoteBlock[] | undefined;
    return normalizeFirstBlockAsHeading(blocks);
  }, [initialBlocks]);

  const editor = useCreateBlockNote({
    initialContent,
    dictionary: {
      ...zh,
      placeholders: {
        ...zh.placeholders,
        heading: '请输入标题',
      },
    },
  });

  // 强制首块为 heading：阻止删除首块、阻止将首块转换为非 heading
  useEffect(() => {
    const cleanup = editor.onBeforeChange(({ getChanges }) => {
      const firstBlock = editor.document[0];
      if (!firstBlock) return true;

      for (const change of getChanges()) {
        if (change.type === 'delete' && change.block.id === firstBlock.id) {
          return false; // 禁止删除首块
        }
        if (
          change.type === 'update' &&
          change.prevBlock.id === firstBlock.id &&
          change.prevBlock.type === 'heading' &&
          change.block.type !== 'heading'
        ) {
          return false; // 禁止将首块从 heading 转为其他类型
        }
      }
      return true;
    });
    return cleanup;
  }, [editor]);

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
