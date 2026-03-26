/* eslint-disable react-refresh/only-export-components -- BlockNote inline spec 与展示组件同文件 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DefaultStyleSchema } from '@blocknote/core';
import { TextSelection } from '@tiptap/pm/state';
import type { Transaction } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { createReactInlineContentSpec } from '@blocknote/react';
import type { ReactCustomInlineContentRenderProps } from '@blocknote/react';

import { renderKatexInto } from '../katexRender';
import { LatexEditPopover } from '../LatexEditPopover';
import {
  computeLatexPopoverPlacement,
  isLatexPopoverAnchorMeasurable,
} from '../latexPopoverGeometry';
import popoverStyles from './style.module.less';
import { useFocusPopoverTextarea } from '../useFocusPopoverTextarea';
import { useLatexPopoverAnchorSync } from '../useLatexPopoverAnchorSync';

import 'katex/dist/katex.min.css';

const inlineMathConfig = {
  type: 'inlineMath',
  propSchema: {
    expression: {
      default: '',
    },
    autoOpenEdit: {
      default: false,
    },
  },
  content: 'none',
} as const;

const INLINE_MATH_PM_TYPE = 'inlineMath';

/** 仅依赖 PM 视图与 transact，避免与 BlockNote 泛型编辑器类型冲突 */
type EditorForPmCaret = {
  prosemirrorView: EditorView;
  transact: (fn: (tr: Transaction) => void | Transaction) => void;
  focus: () => void;
};

/**
 * 将光标放到当前行内公式节点之后，便于继续输入正文。
 */
function placeCaretAfterInlineMathNode(editor: EditorForPmCaret, shell: HTMLElement | null): void {
  if (!shell) {
    return;
  }
  const view = editor.prosemirrorView;
  const { state } = view;
  let afterPos: number | null = null;

  try {
    const start = view.posAtDOM(shell, 0);
    const $pos = state.doc.resolve(start);
    const next = $pos.nodeAfter;
    if (next?.type.name === INLINE_MATH_PM_TYPE) {
      afterPos = start + next.nodeSize;
    }
  } catch {
    afterPos = null;
  }

  if (afterPos == null) {
    try {
      afterPos = view.posAtDOM(shell, shell.childNodes.length);
    } catch {
      return;
    }
  }

  const max = state.doc.content.size;
  if (afterPos == null) {
    return;
  }
  const anchor = Math.min(Math.max(0, afterPos), max);
  editor.transact((tr) => tr.setSelection(TextSelection.create(tr.doc, anchor)));
  editor.focus();
}

function InlineMathView(
  props: ReactCustomInlineContentRenderProps<typeof inlineMathConfig, DefaultStyleSchema>
) {
  const { contentRef, updateInlineContent, inlineContent, editor } = props;
  const expression = inlineContent.props.expression as string;
  const autoOpenEdit = inlineContent.props.autoOpenEdit as boolean;

  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(expression);
  const shellRef = useRef<HTMLSpanElement | null>(null);
  const mathRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textareaBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [popoverPos, setPopoverPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const clearPopoverPos = useCallback(() => {
    setPopoverPos(null);
  }, []);

  const measurePopoverPosition = useCallback(() => {
    const el = shellRef.current;
    if (!el) {
      return false;
    }
    const r = el.getBoundingClientRect();
    /** 插件刚插入行内节点时，首帧常未参与排版，rect 为 0 —— 不可用于定位 */
    if (!isLatexPopoverAnchorMeasurable(r)) {
      return false;
    }
    setPopoverPos(
      computeLatexPopoverPlacement(r, { minWidth: 260, maxWidth: 360, estHeight: 200 })
    );
    return true;
  }, []);

  useLatexPopoverAnchorSync(isEditing, shellRef, measurePopoverPosition, clearPopoverPos);

  useEffect(() => {
    if (isEditing) return;
    setValue(expression);
  }, [expression, isEditing]);

  const displayLatex = isEditing ? value : expression;

  useEffect(() => {
    const el = mathRef.current;
    if (!el) return;
    renderKatexInto(el, displayLatex, popoverStyles.mathPlaceholder, false);
  }, [displayLatex]);

  useEffect(() => {
    if (!autoOpenEdit) return;
    const openExpr = inlineContent.props.expression as string;
    updateInlineContent({
      type: 'inlineMath',
      props: {
        expression: openExpr,
        autoOpenEdit: false,
      },
    });
    setValue(openExpr);
    setIsEditing(true);
    // 仅在插件将 autoOpenEdit 置为 true 时拉起编辑
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 刻意仅在 autoOpenEdit 边沿触发
  }, [autoOpenEdit]);

  useFocusPopoverTextarea(isEditing, popoverPos, inputRef);

  const cancel = () => {
    if (textareaBlurTimerRef.current !== null) {
      clearTimeout(textareaBlurTimerRef.current);
      textareaBlurTimerRef.current = null;
    }
    setValue(expression);
    setIsEditing(false);
  };

  const commit = () => {
    if (textareaBlurTimerRef.current !== null) {
      clearTimeout(textareaBlurTimerRef.current);
      textareaBlurTimerRef.current = null;
    }
    updateInlineContent({
      type: 'inlineMath',
      props: { expression: value.trim(), autoOpenEdit: false },
    });
    setIsEditing(false);
    const shell = shellRef.current;
    window.requestAnimationFrame(() => {
      placeCaretAfterInlineMathNode(editor, shell);
    });
  };

  const handleTextareaBlur = () => {
    if (textareaBlurTimerRef.current !== null) {
      clearTimeout(textareaBlurTimerRef.current);
    }
    textareaBlurTimerRef.current = window.setTimeout(() => {
      textareaBlurTimerRef.current = null;
      commit();
    }, 0);
  };

  const enterEdit = () => {
    setValue(expression);
    setIsEditing(true);
  };

  const setShellRef = useCallback(
    (el: HTMLSpanElement | null) => {
      shellRef.current = el;
      contentRef(el);
    },
    [contentRef]
  );

  const editPopover = (
    <LatexEditPopover
      visible={Boolean(isEditing && popoverPos)}
      position={popoverPos}
      title="编辑 LaTeX（行内）"
      hint="Enter / Shift+Enter 确定 · Esc 取消 · 不可换行"
      textareaClassName={popoverStyles.inlineEditTextarea}
      value={value}
      onChange={(e) => setValue(e.target.value.replace(/\n/g, ''))}
      onCommit={commit}
      commitEnterUnlessShift={false}
      onCancel={cancel}
      onBlur={handleTextareaBlur}
      rows={2}
      inputRef={inputRef}
    />
  );

  return (
    <span
      ref={setShellRef}
      className={`${popoverStyles.mathShellInline} bn-inline-math-root`}
      contentEditable={false}
    >
      <span
        className={popoverStyles.mathRootInline}
        role="button"
        tabIndex={isEditing ? -1 : 0}
        aria-label={isEditing ? undefined : '编辑行内公式'}
        onClick={() => {
          if (!isEditing) enterEdit();
        }}
        onKeyDown={(e) => {
          if (isEditing) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            enterEdit();
          }
        }}
      >
        <span ref={mathRef} className={popoverStyles.mathPreviewInline} />
      </span>
      {editPopover}
    </span>
  );
}

function InlineMathExportHTML(
  props: ReactCustomInlineContentRenderProps<typeof inlineMathConfig, DefaultStyleSchema>
) {
  const expr = props.inlineContent.props.expression as string;
  const text = `$$${expr}$$`;
  return <span data-inline-math-export={text}>{text}</span>;
}

export const inlineMathContentSpec = createReactInlineContentSpec(inlineMathConfig, {
  render: InlineMathView,
  toExternalHTML: InlineMathExportHTML,
});
