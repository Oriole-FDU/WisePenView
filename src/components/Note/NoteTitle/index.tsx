import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import type { Block as BlockNoteBlock } from '@blocknote/core';
import { zh } from '@blocknote/core/locales';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

import type { NoteTitleProps } from './index.type';
import styles from './style.module.less';

/** 与 Pipeline 一致的防抖时长（ms） */
const TITLE_DEBOUNCE_MS = 500;

/** 从 block 的 content（InlineContent[]）提取纯文本 */
function getBlockPlainText(block: { content?: unknown[] } | undefined): string {
  const content = block?.content;
  if (!content || !Array.isArray(content)) return '';
  return content
    .map((c: unknown) => {
      const item = c as { type?: string; text?: string; content?: { text?: string }[] };
      if (item.type === 'text' && typeof item.text === 'string') return item.text;
      if (item.type === 'link' && Array.isArray(item.content)) {
        return (item.content as { text?: string }[]).map((x) => x.text ?? '').join('');
      }
      return '';
    })
    .join('');
}

const DEFAULT_HEADING_BLOCK = [
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
] as unknown as BlockNoteBlock[];

/** 确保为 heading 1 块 */
function toHeadingBlock(block: BlockNoteBlock | undefined): BlockNoteBlock[] {
  if (!block) return DEFAULT_HEADING_BLOCK;
  const normalized = {
    ...block,
    type: 'heading',
    props: { ...block.props, level: 1 },
  } as BlockNoteBlock;
  return [normalized];
}

const NoteTitle: React.FC<NoteTitleProps> = ({
  initialBlock,
  onEnterKey,
  focusOnMount,
  onTitleStable,
}) => {
  const titleDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialContent = useMemo(
    () => toHeadingBlock(initialBlock as unknown as BlockNoteBlock | undefined),
    [initialBlock]
  );

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

  useEffect(() => {
    if (!focusOnMount) return;
    const id = setTimeout(() => editor.focus(), 0);
    return () => clearTimeout(id);
  }, [editor, focusOnMount]);

  const triggerTitleDebounceTimer = useCallback(() => {
    if (titleDebounceTimerRef.current) {
      clearTimeout(titleDebounceTimerRef.current);
      titleDebounceTimerRef.current = null;
    }
    if (!onTitleStable) return;
    titleDebounceTimerRef.current = setTimeout(() => {
      titleDebounceTimerRef.current = null;
      const firstBlock = editor.document[0];
      const raw = getBlockPlainText(firstBlock as { content?: unknown[] } | undefined);
      const trimmed = raw.trim();
      if (trimmed) onTitleStable(trimmed);
    }, TITLE_DEBOUNCE_MS);
  }, [editor, onTitleStable]);

  useEffect(() => {
    if (!onTitleStable) return;
    const cleanup = editor.onChange(() => {
      const firstBlock = editor.document[0];
      if (!firstBlock) return;
      triggerTitleDebounceTimer();
    });
    return cleanup;
  }, [editor, onTitleStable, triggerTitleDebounceTimer]);

  useEffect(() => {
    return () => {
      if (titleDebounceTimerRef.current) {
        clearTimeout(titleDebounceTimerRef.current);
        titleDebounceTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const cleanup = editor.onBeforeChange(({ getChanges }) => {
      const firstBlock = editor.document[0];
      if (!firstBlock) return true;
      for (const change of getChanges()) {
        if (change.type === 'delete' && change.block.id === firstBlock.id) {
          return false;
        }
        if (change.type === 'insert') {
          return false;
        }
        if (
          change.type === 'update' &&
          change.prevBlock.id === firstBlock.id &&
          change.prevBlock.type === 'heading' &&
          change.block.type !== 'heading'
        ) {
          return false;
        }
      }
      return true;
    });
    return cleanup;
  }, [editor]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      onEnterKey?.();
      return;
    }
    if (e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      onEnterKey?.();
      return;
    }
    if (e.key === 'ArrowRight') {
      const firstBlock = editor.document[0];
      if (!firstBlock) return;
      try {
        const sel = document.getSelection();
        if (!sel || !sel.anchorNode) return;
        const range = document.createRange();
        range.setStart(sel.anchorNode, sel.anchorOffset);
        const editable = (e.currentTarget as HTMLElement).querySelector('[contenteditable="true"]');
        if (!editable) return;
        range.setEnd(editable, editable.childNodes.length);
        if (range.toString().length === 0) {
          e.preventDefault();
          e.stopPropagation();
          onEnterKey?.();
        }
      } catch {
        // 无法判断是否在末尾时忽略
      }
    }
  };

  return (
    <div className={styles.titleWrapper} onKeyDownCapture={handleKeyDown}>
      <BlockNoteView editor={editor} theme="light" sideMenu={false} slashMenu={false} />
    </div>
  );
};

export default NoteTitle;
