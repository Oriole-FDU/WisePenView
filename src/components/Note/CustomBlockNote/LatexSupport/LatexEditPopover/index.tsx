import { createPortal } from 'react-dom';
import type { ChangeEvent, KeyboardEvent, RefObject } from 'react';

import popoverStyles from '../InlineMath/style.module.less';

export interface LatexEditPopoverProps {
  /** 为 true 时挂载到 document.body */
  visible: boolean;
  position: { top: number; left: number; width: number } | null;
  /** 标题与 dialog 的 aria-label */
  title: string;
  hint: string;
  textareaClassName: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onCommit: () => void;
  /**
   * true：仅 Enter（无 Shift）时提交，Shift+Enter 换行（块级多行）。
   * false：Enter / NumpadEnter 即提交（行内、不可换行）。
   */
  commitEnterUnlessShift: boolean;
  onCancel: () => void;
  onBlur: () => void;
  rows: number;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  /** MathBlock 需 ref 到浮层根节点，供 blur 时判断焦点是否在 Portal 内 */
  rootRef?: RefObject<HTMLDivElement | null>;
}

function handleTextareaKeyDown(
  e: KeyboardEvent<HTMLTextAreaElement>,
  onCancel: () => void,
  onCommit: () => void,
  commitEnterUnlessShift: boolean
): void {
  e.stopPropagation();
  if (e.key === 'Escape') {
    e.preventDefault();
    onCancel();
    return;
  }
  if (e.key === 'Enter' || e.key === 'NumpadEnter') {
    if (commitEnterUnlessShift && e.shiftKey) {
      return;
    }
    e.preventDefault();
    onCommit();
  }
}

/**
 * 行内 / 块级公式共用的 LaTeX 编辑浮层（Portal → body，样式来自 InlineMath/style.module.less）。
 */
export function LatexEditPopover(props: LatexEditPopoverProps) {
  const {
    visible,
    position,
    title,
    hint,
    textareaClassName,
    value,
    onChange,
    onCommit,
    commitEnterUnlessShift,
    onCancel,
    onBlur,
    rows,
    inputRef,
    rootRef,
  } = props;

  if (!visible || position === null) {
    return null;
  }

  return createPortal(
    <div
      ref={rootRef}
      className={popoverStyles.inlineEditPopover}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
      role="dialog"
      aria-label={title}
    >
      <div className={popoverStyles.inlineEditPopoverHeader}>{title}</div>
      <textarea
        ref={inputRef}
        className={textareaClassName}
        value={value}
        onChange={onChange}
        onKeyDown={(e) => handleTextareaKeyDown(e, onCancel, onCommit, commitEnterUnlessShift)}
        onBlur={onBlur}
        rows={rows}
        spellCheck={false}
        autoComplete="off"
        aria-label="LaTeX 源码"
      />
      <div className={popoverStyles.inlineEditHint}>{hint}</div>
    </div>,
    document.body
  );
}
