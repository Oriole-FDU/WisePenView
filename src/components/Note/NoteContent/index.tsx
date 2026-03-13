import React, { useCallback, useImperativeHandle, useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import type { Block as BlockNoteBlock } from '@blocknote/core';
import { zh, en } from '@blocknote/core/locales';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

import type { NoteChange, Block } from '@/types/note';
import type { NoteContentProps, NoteContentRef } from './index.type';
import styles from './style.module.less';

/** 合并中英文 slash_menu：界面用中文，aliases 含中文+英文，便于 / 后中英文都能筛中 */
const dictionaryZhWithEnAliases = (() => {
  const zhSlash = zh.slash_menu as Record<
    string,
    { title?: string; subtext?: string; aliases?: string[]; group?: string }
  >;
  const enSlash = (en as typeof zh).slash_menu as
    | Record<string, { aliases?: string[] }>
    | undefined;
  const slash_menu = {} as typeof zh.slash_menu;
  for (const key of Object.keys(zhSlash)) {
    const item = { ...zhSlash[key] };
    const zhAliases = Array.isArray(item.aliases) ? item.aliases : [];
    const enAliases = enSlash?.[key]?.aliases ?? [];
    item.aliases = [...new Set([...zhAliases, ...enAliases])];
    (slash_menu as Record<string, unknown>)[key] = item;
  }
  return { ...zh, slash_menu };
})();

const NoteContent = React.forwardRef<NoteContentRef, NoteContentProps>(
  ({ pipeline, initialBlocks }, ref) => {
    const initialContent = useMemo(() => {
      const blocks = initialBlocks as unknown as BlockNoteBlock[] | undefined;
      return blocks && blocks.length > 0 ? blocks : undefined;
    }, [initialBlocks]);

    const editor = useCreateBlockNote({
      initialContent,
      dictionary: dictionaryZhWithEnAliases,
    });

    useImperativeHandle(
      ref,
      () => ({
        focus: () => editor.focus(),
        getBlocks: () => editor.document as unknown as Block[],
      }),
      [editor]
    );

    const handleChange = useCallback(
      (
        _editor: unknown,
        ctx: {
          getChanges: () => Array<{
            type: string;
            block: { id: string } & Record<string, unknown>;
          }>;
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
  }
);

NoteContent.displayName = 'NoteContent';

export default NoteContent;
