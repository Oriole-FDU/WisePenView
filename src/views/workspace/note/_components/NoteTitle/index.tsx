import type { Block as BlockNoteBlock } from '@blocknote/core';
import { en, zh } from '@blocknote/core/locales';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { useLatest, useMemoizedFn, useMount, useUnmount } from 'ahooks';
import { useEffect, useImperativeHandle, useRef, type KeyboardEvent, type Ref } from 'react';
import { useTranslation } from 'react-i18next';

import { useNewNoteStore } from '@/components/Note/_store/useNewNoteStore';
import { getProseMirrorRoot } from '@/components/Note/CustomBlockNote/engines/editor/dom';
import { useNoteService } from '@/domains';
import { useAppTheme } from '@/theme';

import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import styles from './style.module.less';

export interface NoteTitleHandle {
  /** 当前标题编辑区纯文本，空则“未命名笔记”。 */
  getPlainTitle: () => string;
  /** 标题 BlockNote 的 ProseMirror 根 DOM，供打印克隆。 */
  getProseMirrorRoot: () => HTMLElement | null;
}

export type NoteTitleSaveStatus = 'saving' | 'saved' | 'failed';

interface NoteTitleProps {
  id: string;
  initialContent: string;
  onEnterKey: () => void;
  focusOnMount: boolean;
  readOnly: boolean;
  onSaveStatusChange: (status: NoteTitleSaveStatus) => void;
}

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

function toHeadingBlockFromTitle(
  title: string | undefined,
  untitledTitle: string
): BlockNoteBlock[] {
  const trimmedTitle = title?.trim();
  if (trimmedTitle === untitledTitle || !trimmedTitle) {
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
  readOnly,
  onSaveStatusChange,
  ref,
}: NoteTitleProps & { ref?: Ref<NoteTitleHandle> }) {
  const { i18n, t } = useTranslation('note');
  const { resolvedTheme } = useAppTheme();
  const noteService = useNoteService();
  const latestIdRef = useLatest(id);
  const titleDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveVersionRef = useRef(0);
  const emitSaveStatus = useMemoizedFn(onSaveStatusChange);
  const untitledTitle = t('title.untitled');
  const editorDictionary = i18n.resolvedLanguage === 'en-US' ? en : zh;

  const editor = useCreateBlockNote({
    initialContent: toHeadingBlockFromTitle(initialContent, untitledTitle),
    dictionary: {
      ...editorDictionary,
      placeholders: {
        ...editorDictionary.placeholders,
        heading: t('title.placeholder'),
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
        return trimmed || untitledTitle;
      },
      getProseMirrorRoot: () => getProseMirrorRoot(editor),
    }),
    [editor, untitledTitle]
  );

  useMount(() => {
    if (!focusOnMount) return;
    focusTimerRef.current = setTimeout(() => {
      editor.focus();
      focusTimerRef.current = null;
    }, 0);
  });

  /**
   * @wisepen-manual-effect
   * 执行时机：标题编辑器实例或只读状态变化时重新注册编辑器事件。
   * 不可替代原因：BlockNote 的 onChange/onBeforeChange 是命令式外部订阅，无法由 JSX 表达。
   * cleanup：注销本轮两个编辑器监听器，防止旧实例或旧只读状态继续响应。
   */
  useEffect(() => {
    if (readOnly) return;
    const detachOnChange = editor.onChange(() => {
      const firstBlock = editor.document[0];
      if (!firstBlock) return;

      const currentId = latestIdRef.current;
      saveVersionRef.current += 1;
      const saveVersion = saveVersionRef.current;
      emitSaveStatus('saving');
      if (titleDebounceTimerRef.current) {
        clearTimeout(titleDebounceTimerRef.current);
        titleDebounceTimerRef.current = null;
      }
      titleDebounceTimerRef.current = setTimeout(() => {
        titleDebounceTimerRef.current = null;
        const block = editor.document[0];
        const raw = getBlockPlainText(block as { content?: unknown[] } | undefined);
        const nextTitle = raw.trim() || untitledTitle;
        void noteService.syncTitle({ resourceId: currentId, newName: nextTitle }).then(
          () => {
            if (saveVersion === saveVersionRef.current) {
              emitSaveStatus('saved');
            }
          },
          (error: unknown) => {
            if (saveVersion === saveVersionRef.current) {
              emitSaveStatus('failed');
            }
            toast.danger(parseErrorMessage(error));
          }
        );
      }, TITLE_DEBOUNCE_MS);

      const newNoteState = useNewNoteStore.getState();
      if (newNoteState.newNoteResourceId === currentId) {
        const raw = getBlockPlainText(firstBlock as { content?: unknown[] } | undefined);
        if (raw.trim()) {
          newNoteState.markNewNoteDirty(currentId);
        }
      }
    });

    const detachBeforeChange = editor.onBeforeChange(({ getChanges }) => {
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
    return () => {
      detachOnChange();
      detachBeforeChange();
    };
  }, [editor, emitSaveStatus, latestIdRef, noteService, readOnly, untitledTitle]);

  useUnmount(() => {
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }
    if (titleDebounceTimerRef.current) {
      clearTimeout(titleDebounceTimerRef.current);
      titleDebounceTimerRef.current = null;
    }
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      onEnterKey();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      onEnterKey();
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
          onEnterKey();
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
        theme={resolvedTheme}
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
