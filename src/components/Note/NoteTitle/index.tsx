import type { Block as BlockNoteBlock } from '@blocknote/core';
import { zh } from '@blocknote/core/locales';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { useMount, useUnmount, useUpdateEffect } from 'ahooks';
import React, { useImperativeHandle, useMemo, useRef, type Ref } from 'react';

import { useNoteService } from '@/domains';
import { useNewNoteStore } from '@/store';

import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { getProseMirrorRoot } from '../CustomBlockNote/plugins/editorProseMirrorRoot';
import type { NoteTitleHandle, NoteTitleProps } from './index.type';
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

function toHeadingBlockFromTitle(title?: string): BlockNoteBlock[] {
  const trimmedTitle = title?.trim();
  if (trimmedTitle === '未命名笔记' || !trimmedTitle) {
    return DEFAULT_HEADING_BLOCK;
  }
  return [
    {
      ...DEFAULT_HEADING_BLOCK[0],
      content: [{ type: 'text', text: trimmedTitle, styles: {} }],
    } as BlockNoteBlock,
  ];
}

function NoteTitle({
  id,
  initialContent,
  onEnterKey,
  focusOnMount,
  readOnly = false,
  ref,
}: NoteTitleProps & { ref?: Ref<NoteTitleHandle> }) {
  const noteService = useNoteService();
  const latestIdRef = useRef(id);
  const titleDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeCleanupRef = useRef<(() => void) | null>(null);
  const beforeChangeCleanupRef = useRef<(() => void) | null>(null);
  const readOnlyRef = useRef(readOnly);

  useUpdateEffect(() => {
    latestIdRef.current = id;
    readOnlyRef.current = readOnly;
  }, [id, readOnly]);

  /** 标题初始值由上层传入（未就绪时回退为空 H1） */
  const initialTitleBlocks = useMemo(
    () => toHeadingBlockFromTitle(initialContent),
    [initialContent]
  );

  const editor = useCreateBlockNote({
    initialContent: initialTitleBlocks,
    dictionary: {
      ...zh,
      placeholders: {
        ...zh.placeholders,
        heading: '请输入标题',
      },
    },
    trailingBlock: false,
  });

  useImperativeHandle(
    ref,
    () => ({
      getPlainTitle: () => {
        const firstBlock = editor.document[0];
        const raw = getBlockPlainText(firstBlock as { content?: unknown[] } | undefined);
        const trimmed = raw.trim();
        return trimmed || '未命名笔记';
      },
      getProseMirrorRoot: () => getProseMirrorRoot(editor),
    }),
    [editor]
  );

  useMount(() => {
    if (!focusOnMount) return;
    focusTimerRef.current = setTimeout(() => {
      editor.focus();
      focusTimerRef.current = null;
    }, 0);
  });

  const detachTitleHandlers = () => {
    if (onChangeCleanupRef.current) {
      onChangeCleanupRef.current();
      onChangeCleanupRef.current = null;
    }
    if (beforeChangeCleanupRef.current) {
      beforeChangeCleanupRef.current();
      beforeChangeCleanupRef.current = null;
    }
  };

  const attachTitleHandlers = () => {
    detachTitleHandlers();

    onChangeCleanupRef.current = editor.onChange(() => {
      const firstBlock = editor.document[0];
      if (!firstBlock) return;

      if (!readOnlyRef.current) {
        const currentId = latestIdRef.current;
        if (currentId) {
          if (titleDebounceTimerRef.current) {
            clearTimeout(titleDebounceTimerRef.current);
            titleDebounceTimerRef.current = null;
          }
          titleDebounceTimerRef.current = setTimeout(() => {
            titleDebounceTimerRef.current = null;
            const block = editor.document[0];
            const raw = getBlockPlainText(block as { content?: unknown[] } | undefined);
            const nextTitle = raw.trim() || '未命名笔记';
            void noteService
              .syncTitle({ resourceId: currentId, newName: nextTitle })
              .catch((error) => {
                toast.danger(parseErrorMessage(error));
              });
          }, TITLE_DEBOUNCE_MS);
        }
      }

      const currentId = latestIdRef.current;
      if (currentId != null && currentId !== '') {
        const raw = getBlockPlainText(firstBlock as { content?: unknown[] } | undefined);
        const isTitleEmpty = raw.trim().length === 0;
        useNewNoteStore.getState().syncNewNoteTitleFromEditor(currentId, isTitleEmpty);
      }
    });

    beforeChangeCleanupRef.current = editor.onBeforeChange(({ getChanges }) => {
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
  };

  useMount(() => {
    if (!readOnly) {
      attachTitleHandlers();
    }
    return detachTitleHandlers;
  });

  useUpdateEffect(() => {
    detachTitleHandlers();
    if (!readOnly) {
      attachTitleHandlers();
    }
    return detachTitleHandlers;
  }, [readOnly, editor]);

  useUnmount(() => {
    detachTitleHandlers();
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }
    if (titleDebounceTimerRef.current) {
      clearTimeout(titleDebounceTimerRef.current);
      titleDebounceTimerRef.current = null;
    }
  });

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
        editable={!readOnly}
      />
    </div>
  );
}

export default NoteTitle;
