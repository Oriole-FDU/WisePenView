// eslint-disable-next-line no-restricted-imports -- Note 待重构：暂时允许 useEffect
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import type { Block as BlockNoteBlock } from '@blocknote/core';
import { zh } from '@blocknote/core/locales';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

import { useNoteService } from '@/contexts/ServicesContext';

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

const NoteTitle: React.FC<NoteTitleProps> = ({ id, onEnterKey, focusOnMount }) => {
  const noteService = useNoteService();
  const titleDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 云端拉取标题未接前：空 H1；后续可与笔记详情接口返回的标题对齐后由上层驱动更新策略 */
  const initialContent = useMemo(() => toHeadingBlock(undefined), []);

  const editor = useCreateBlockNote({
    initialContent,
    dictionary: {
      ...zh,
      placeholders: {
        ...zh.placeholders,
        heading: '请输入标题',
      },
    },
    trailingBlock: false,
  });

  useEffect(() => {
    if (!focusOnMount) return;
    const timer = setTimeout(() => {
      editor.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [editor, focusOnMount]);

  /** 标题稳定后调用 NoteService.syncTitle（与 Pipeline 防抖一致） */
  const triggerTitleDebounceTimer = useCallback(() => {
    if (!id) return;
    if (titleDebounceTimerRef.current) {
      clearTimeout(titleDebounceTimerRef.current);
      titleDebounceTimerRef.current = null;
    }
    titleDebounceTimerRef.current = setTimeout(() => {
      titleDebounceTimerRef.current = null;
      const firstBlock = editor.document[0];
      const raw = getBlockPlainText(firstBlock as { content?: unknown[] } | undefined);
      const trimmed = raw.trim();
      if (!trimmed) return;
      void noteService.syncTitle({ resourceId: id, newName: trimmed }).catch(() => {
        // 后续可接全局错误提示
      });
    }, TITLE_DEBOUNCE_MS);
  }, [editor, id, noteService]);

  useEffect(() => {
    if (!id) return;
    const cleanup = editor.onChange(() => {
      const firstBlock = editor.document[0];
      if (!firstBlock) return;
      triggerTitleDebounceTimer();
    });
    return cleanup;
  }, [editor, id, triggerTitleDebounceTimer]);

  useEffect(() => {
    return () => {
      if (titleDebounceTimerRef.current) {
        clearTimeout(titleDebounceTimerRef.current);
        titleDebounceTimerRef.current = null;
      }
    };
  }, []);

  // 防止标题被删除或修改
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

  // 关注点迁移
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
    <div className={styles.wrapper} onKeyDownCapture={handleKeyDown}>
      <BlockNoteView
        editor={editor}
        theme="light"
        sideMenu={false}
        slashMenu={false}
        formattingToolbar={false}
        linkToolbar={false}
        filePanel={false}
        tableHandles={false}
        emojiPicker={false}
      />
    </div>
  );
};

export default NoteTitle;
