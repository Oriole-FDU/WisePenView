import { useMount, useUnmount } from 'ahooks';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useCallback, useRef, useState, type KeyboardEvent, type RefObject } from 'react';

import type {
  NoteBodyEditorHandle,
  NoteFindResult,
} from '@/components/Note/CustomBlockNote/index.type';

import styles from './style.module.less';

interface FindBarProps {
  editorRef: RefObject<NoteBodyEditorHandle>;
  onClose?: () => void;
  /** 是否显示关闭按钮（popover 模式下由外部控制关闭，不需要） */
  showClose?: boolean;
}

function formatResult(result: NoteFindResult | null, total: number): string {
  if (!result || total === 0) return '无匹配';
  return `${result.current} / ${result.total}`;
}

function FindBar({ editorRef, onClose, showClose = true }: FindBarProps) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<NoteFindResult | null>(null);
  const [total, setTotal] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input on mount; restore selection on unmount
  useMount(() => {
    inputRef.current?.focus();
  });

  useUnmount(() => {
    editorRef.current?.clearFind();
  });

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      const editor = editorRef.current;
      if (!editor) return;
      if (value.trim()) {
        const count = editor.findMatches(value);
        setTotal(count);
        setResult(count > 0 ? { current: 1, total: count } : null);
      } else {
        editor.clearFind();
        setTotal(0);
        setResult(null);
      }
    },
    [editorRef]
  );

  const handleNext = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const next = editor.findNext();
    if (next) setResult(next);
  }, [editorRef]);

  const handlePrev = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const prev = editor.findPrev();
    if (prev) setResult(prev);
  }, [editorRef]);

  const handleClose = useCallback(() => {
    editorRef.current?.clearFind();
    onClose?.();
  }, [editorRef, onClose]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          handlePrev();
        } else {
          handleNext();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    },
    [handleNext, handlePrev, handleClose]
  );

  const isEmptyQuery = !query.trim();
  const hasNoResults = total === 0 && query.trim().length > 0;

  return (
    <div className={styles.root} role="search" aria-label="笔记内搜索">
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        value={query}
        placeholder="在笔记中搜索..."
        onChange={(e) => handleQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <span className={styles.count} aria-live="polite">
        {hasNoResults ? '无匹配' : formatResult(result, total)}
      </span>
      <button
        className={styles.navBtn}
        type="button"
        aria-label="上一个匹配"
        disabled={isEmptyQuery}
        onClick={handlePrev}
      >
        <ChevronUp size={16} />
      </button>
      <button
        className={styles.navBtn}
        type="button"
        aria-label="下一个匹配"
        disabled={isEmptyQuery}
        onClick={handleNext}
      >
        <ChevronDown size={16} />
      </button>
      {showClose ? (
        <button className={styles.navBtn} type="button" aria-label="关闭搜索" onClick={handleClose}>
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}

export default FindBar;
