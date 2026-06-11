/* eslint-disable react-refresh/only-export-components -- BlockNote inline spec 与展示组件同文件 */
import type { DefaultStyleSchema } from '@blocknote/core';
import type { ReactCustomInlineContentRenderProps } from '@blocknote/react';
import { createReactInlineContentSpec } from '@blocknote/react';
import type { Transaction } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { AI_DIFF_DISPLAY_MODE, type AiDiffDisplayMode } from '@/domains/Note/enum';
import { useEffectForce } from '@/hooks/useEffectForce';
import 'katex/dist/katex.min.css';
import type { FormulaThreadAnchor } from '../../../comments/commentThreadConstants';
import { useLatexComment } from '../../../comments/formula/latexCommentContext';
import { captureInlineMathAnchor } from '../../../comments/formula/latexCommentSupport';
import { LatexFormulaCommentButton } from '../../../comments/formula/LatexFormulaCommentButton';
import { useNoteEditorReadOnlyContext } from '../../../editorReadOnly';
import { useAiDiffDisplayModeContext } from '../../AIDiffPlugin/displayModeContext';
import aiDiffStyles from '../../AIDiffPlugin/style.module.less';
import { renderKatexInto } from '../katexRender';
import { LatexEditPopover } from '../LatexEditPopover';
import {
  computeLatexPopoverPlacement,
  isLatexPopoverAnchorMeasurable,
} from '../LatexEditPopover/latexPopoverGeometry';
import { useFocusPopoverTextarea } from '../LatexEditPopover/useFocusPopoverTextarea';
import { useLatexPopoverAnchorSync } from '../LatexEditPopover/useLatexPopoverAnchorSync';
import popoverStyles from './style.module.less';

const inlineMathConfig = {
  type: 'inlineMath',
  propSchema: {
    expression: {
      default: '',
    },
    autoOpenEdit: {
      default: false,
    },
    aiDiffType: {
      default: '',
    },
    aiDiffKey: {
      default: '',
    },
    aiDiffOrigin: {
      default: '',
    },
    aiDiffReplace: {
      default: '',
    },
  },
  content: 'none',
} as const;

const INLINE_MATH_PM_TYPE = 'inlineMath';
type InlineMathActionMode = 'accept' | 'discard';
type InlineMathAiDiffViewMode = 'hidden' | 'plain' | 'compare';
type InlineMathProps = ReactCustomInlineContentRenderProps<
  typeof inlineMathConfig,
  DefaultStyleSchema
>['inlineContent']['props'];

type InlineMathAiDiffResolvedView = {
  mode: InlineMathAiDiffViewMode;
  plainExpression: string;
  origin: string;
  replace: string;
  hasDiff: boolean;
};

/** 仅依赖 PM 视图与 transact，避免与 BlockNote 泛型编辑器类型冲突 */
type EditorForPmCaret = {
  prosemirrorView: EditorView;
  transact: (fn: (tr: Transaction) => void | Transaction) => void;
  focus: () => void;
};

function InlineMathFormulaPreview({
  expression,
  className,
}: {
  expression: string;
  className: string;
}) {
  const mathRef = useRef<HTMLSpanElement>(null);

  useEffectForce(() => {
    const el = mathRef.current;
    if (!el) return;
    renderKatexInto(el, expression, popoverStyles.mathPlaceholder, false);
  }, [expression]);

  return <span ref={mathRef} className={className} />;
}

function resolveInlineMathAiDiffViewState(params: {
  displayMode: AiDiffDisplayMode;
  expression: string;
  aiDiffType: string;
  origin: string;
  replace: string;
}): InlineMathAiDiffResolvedView {
  const { displayMode, expression, aiDiffType, origin, replace } = params;
  const hasDiff = aiDiffType === 'edit' || aiDiffType === 'create' || aiDiffType === 'delete';

  if (!hasDiff) {
    return {
      mode: 'plain',
      plainExpression: expression,
      origin: '',
      replace: '',
      hasDiff: false,
    };
  }

  if (displayMode === AI_DIFF_DISPLAY_MODE.OLD_ONLY) {
    const plainExpression = aiDiffType === 'create' ? '' : origin;
    return {
      mode: plainExpression ? 'plain' : 'hidden',
      plainExpression,
      origin,
      replace,
      hasDiff: true,
    };
  }

  if (displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY) {
    const plainExpression = aiDiffType === 'delete' ? '' : replace;
    return {
      mode: plainExpression ? 'plain' : 'hidden',
      plainExpression,
      origin,
      replace,
      hasDiff: true,
    };
  }

  return {
    mode: origin || replace ? 'compare' : 'hidden',
    plainExpression: '',
    origin,
    replace,
    hasDiff: true,
  };
}

function clearInlineMathAiDiffProps(props: InlineMathProps): InlineMathProps {
  return {
    ...props,
    aiDiffType: '',
    aiDiffKey: '',
    aiDiffOrigin: '',
    aiDiffReplace: '',
  };
}

function removeInlineMathNode(editor: EditorForPmCaret, shell: HTMLElement | null): void {
  if (!shell) {
    return;
  }

  const view = editor.prosemirrorView;
  const { state } = view;
  let from: number | null = null;
  let to: number | null = null;
  let anchor = 0;

  try {
    const start = view.posAtDOM(shell, 0);
    const $pos = state.doc.resolve(start);
    const next = $pos.nodeAfter;
    if (next?.type.name === INLINE_MATH_PM_TYPE) {
      from = start;
      to = start + next.nodeSize;
      anchor = start;
    } else {
      const prev = $pos.nodeBefore;
      if (prev?.type.name === INLINE_MATH_PM_TYPE) {
        from = start - prev.nodeSize;
        to = start;
        anchor = Math.max(0, from);
      }
    }
  } catch {
    from = null;
    to = null;
  }

  if (from == null || to == null) {
    return;
  }

  editor.transact((tr) => {
    const maxPos = tr.doc.content.size;
    const safeFrom = Math.max(0, Math.min(from, maxPos));
    const safeTo = Math.max(safeFrom, Math.min(to, maxPos));
    tr.delete(safeFrom, safeTo);
    const nextAnchor = Math.max(0, Math.min(anchor, tr.doc.content.size));
    return tr.setSelection(TextSelection.create(tr.doc, nextAnchor));
  });
  editor.focus();
}

function InlineMathDiffActionButtons({
  onApply,
}: {
  onApply: (mode: InlineMathActionMode) => void;
}) {
  return (
    <span
      className={`${aiDiffStyles.aiActionsAnchor} ${popoverStyles.inlineMathDiffActions}`}
      contentEditable={false}
      aria-hidden="true"
    >
      <span
        className={`${aiDiffStyles.aiActionsRoot} ${popoverStyles.inlineMathDiffActionsRoot}`}
        contentEditable={false}
        aria-hidden="true"
      >
        <button
          type="button"
          aria-label="保留"
          className={`${aiDiffStyles.aiActionBtn} ${aiDiffStyles.aiActionAccept}`}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onApply('accept');
          }}
        >
          Keep
        </button>
        <button
          type="button"
          aria-label="撤销"
          className={`${aiDiffStyles.aiActionBtn} ${aiDiffStyles.aiActionDiscard}`}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onApply('discard');
          }}
        >
          Undo
        </button>
      </span>
    </span>
  );
}

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
  const aiDiffDisplayMode = useAiDiffDisplayModeContext();
  const { contentRef, updateInlineContent, inlineContent, editor } = props;
  const readOnly = useNoteEditorReadOnlyContext();
  const latexComment = useLatexComment();
  const expression = inlineContent.props.expression as string;
  const autoOpenEdit = inlineContent.props.autoOpenEdit as boolean;
  const aiDiffType = String(inlineContent.props.aiDiffType ?? '');
  const aiDiffOrigin = String(inlineContent.props.aiDiffOrigin ?? '');
  const aiDiffReplace = String(inlineContent.props.aiDiffReplace ?? '');

  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(expression);
  const shellRef = useRef<HTMLSpanElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textareaBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [popoverPos, setPopoverPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const anchorRef = useRef<FormulaThreadAnchor | null>(null);

  useLayoutEffect(() => {
    if (!shellRef.current) {
      return;
    }
    const next = captureInlineMathAnchor(editor, shellRef.current);
    if (next) {
      anchorRef.current = next;
    }
  }, [editor, expression, isEditing]);

  const getInlineFormulaAnchor = () =>
    (shellRef.current ? captureInlineMathAnchor(editor, shellRef.current) : null) ??
    anchorRef.current;

  const updateInlineFormulaReference = (
    nextExpression: string,
    anchor = getInlineFormulaAnchor(),
    persist = false
  ) => {
    if (!anchor) {
      return;
    }
    latexComment?.updateFormulaCommentReference({
      anchor,
      expression: nextExpression,
      kind: 'inline',
      persist,
    });
  };

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

  const viewState = resolveInlineMathAiDiffViewState({
    displayMode: aiDiffDisplayMode,
    expression,
    aiDiffType,
    origin: aiDiffOrigin,
    replace: aiDiffReplace,
  });
  const hasPendingAiDiff = viewState.hasDiff;
  const canEnterEdit = !readOnly && !hasPendingAiDiff && !isEditing;

  // TODO: 重构，不使用useEffect，使用更合适的语义以增加可读性，但是latexSupport有完全重构的可能，因此暂时保留
  useEffectForce(() => {
    if (isEditing) return;
    setValue(expression);
  }, [expression, isEditing]);

  const displayLatex = isEditing ? value : expression;

  useEffectForce(() => {
    if (readOnly) return;
    if (!autoOpenEdit) return;
    const openExpr = inlineContent.props.expression as string;
    updateInlineContent({
      type: 'inlineMath',
      props: {
        ...clearInlineMathAiDiffProps(inlineContent.props),
        expression: openExpr,
        autoOpenEdit: false,
      },
    });
    setValue(openExpr);
    setIsEditing(true);
    // 仅在插件将 autoOpenEdit 置为 true 时拉起编辑
  }, [autoOpenEdit]);

  useFocusPopoverTextarea(isEditing, popoverPos, inputRef);

  const cancel = () => {
    if (textareaBlurTimerRef.current !== null) {
      clearTimeout(textareaBlurTimerRef.current);
      textareaBlurTimerRef.current = null;
    }
    setValue(expression);
    updateInlineFormulaReference(expression);
    const anchor = getInlineFormulaAnchor();
    if (anchor) {
      window.setTimeout(() => {
        latexComment?.clearFormulaCommentReferenceOverride(anchor);
      }, 0);
    }
    setIsEditing(false);
  };

  const commit = () => {
    if (textareaBlurTimerRef.current !== null) {
      clearTimeout(textareaBlurTimerRef.current);
      textareaBlurTimerRef.current = null;
    }
    updateInlineContent({
      type: 'inlineMath',
      props: {
        ...clearInlineMathAiDiffProps(inlineContent.props),
        expression: value.trim(),
        autoOpenEdit: false,
      },
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
    if (readOnly) return;
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

  const applyAiDiffAction = useCallback(
    (mode: InlineMathActionMode) => {
      const baseProps = clearInlineMathAiDiffProps(inlineContent.props);

      if (aiDiffType === 'create') {
        if (mode === 'accept') {
          updateInlineContent({
            type: 'inlineMath',
            props: {
              ...baseProps,
              expression: aiDiffReplace,
              autoOpenEdit: false,
            },
          });
        } else {
          removeInlineMathNode(editor, shellRef.current);
        }
        return;
      }

      if (aiDiffType === 'delete') {
        if (mode === 'accept') {
          removeInlineMathNode(editor, shellRef.current);
        } else {
          updateInlineContent({
            type: 'inlineMath',
            props: {
              ...baseProps,
              expression: aiDiffOrigin,
              autoOpenEdit: false,
            },
          });
        }
        return;
      }

      const nextExpression = mode === 'accept' ? aiDiffReplace : aiDiffOrigin;
      updateInlineContent({
        type: 'inlineMath',
        props: {
          ...baseProps,
          expression: nextExpression,
          autoOpenEdit: false,
        },
      });
    },
    [aiDiffOrigin, aiDiffReplace, aiDiffType, editor, inlineContent.props, updateInlineContent]
  );

  const editPopover = (
    <LatexEditPopover
      visible={Boolean(isEditing && popoverPos)}
      position={popoverPos}
      title="编辑 LaTeX（行内）"
      hint="Enter / Shift+Enter 确定 · Esc 取消 · 不可换行"
      textareaClassName={popoverStyles.inlineEditTextarea}
      value={value}
      onChange={(e) => {
        const nextValue = e.target.value.replace(/\n/g, '');
        setValue(nextValue);
        updateInlineFormulaReference(nextValue);
      }}
      onCommit={commit}
      commitEnterUnlessShift={false}
      onCancel={cancel}
      onBlur={handleTextareaBlur}
      rows={2}
      inputRef={inputRef}
    />
  );

  if (viewState.mode === 'hidden') {
    return (
      <span
        ref={setShellRef}
        className={aiDiffStyles.aiDiffInlineStrategyHidden}
        contentEditable={false}
        aria-hidden="true"
      >
        {'\u200B'}
      </span>
    );
  }

  return (
    <span
      ref={setShellRef}
      className={`${popoverStyles.mathShellInline} bn-inline-math-root`}
      contentEditable={false}
    >
      {!isEditing && !hasPendingAiDiff ? (
        <LatexFormulaCommentButton expression={expression} kind="inline" shellRef={shellRef} />
      ) : null}
      {viewState.mode === 'plain' ? (
        <span
          className={
            canEnterEdit
              ? popoverStyles.mathRootInline
              : `${popoverStyles.mathRootInline} ${popoverStyles.mathRootInlineReadonly}`
          }
          role={canEnterEdit ? 'button' : undefined}
          tabIndex={canEnterEdit ? 0 : -1}
          aria-readonly={readOnly || undefined}
          aria-label={canEnterEdit ? '编辑行内公式' : undefined}
          onClick={() => {
            if (canEnterEdit) enterEdit();
          }}
          onKeyDown={(e) => {
            if (!canEnterEdit) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              enterEdit();
            }
          }}
        >
          <InlineMathFormulaPreview
            expression={isEditing ? value : viewState.plainExpression || displayLatex}
            className={popoverStyles.mathPreviewInline}
          />
        </span>
      ) : null}
      {viewState.mode === 'compare' ? (
        <span
          className={`${popoverStyles.inlineMathDiffRoot} ${aiDiffStyles.aiDiffRoot}`}
          contentEditable={false}
        >
          {viewState.origin ? (
            <span
              className={`${popoverStyles.inlineMathDiffCard} ${popoverStyles.inlineMathDiffDelete}`}
            >
              <InlineMathFormulaPreview
                expression={viewState.origin}
                className={popoverStyles.mathPreviewInline}
              />
            </span>
          ) : null}
          {viewState.replace ? (
            <span
              className={`${popoverStyles.inlineMathDiffCard} ${popoverStyles.inlineMathDiffAdd}`}
            >
              <InlineMathFormulaPreview
                expression={viewState.replace}
                className={popoverStyles.mathPreviewInline}
              />
            </span>
          ) : null}
          <span className={popoverStyles.inlineMathDiffActionLayer}>
            <InlineMathDiffActionButtons onApply={applyAiDiffAction} />
          </span>
        </span>
      ) : null}
      {!hasPendingAiDiff ? editPopover : null}
    </span>
  );
}

function InlineMathExportHTML(
  props: ReactCustomInlineContentRenderProps<typeof inlineMathConfig, DefaultStyleSchema>
) {
  const expr = String(props.inlineContent.props.expression ?? '').trim();
  const text = expr === '' ? ' $$ $$ ' : ` $${expr}$ `;
  return <span data-inline-math-export={text}>{text}</span>;
}

export const inlineMathContentSpec = createReactInlineContentSpec(inlineMathConfig, {
  render: InlineMathView,
  toExternalHTML: InlineMathExportHTML,
});
