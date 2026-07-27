/* eslint-disable react-refresh/only-export-components -- BlockNote inline spec 与展示组件同文件 */
import type { DefaultStyleSchema } from '@blocknote/core';
import type { ReactCustomInlineContentRenderProps } from '@blocknote/react';
import { createReactInlineContentSpec } from '@blocknote/react';
import type { Transaction } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { useLatest } from 'ahooks';
import 'katex/dist/katex.min.css';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNoteEditorReadOnlyContext } from '../../../engines/editor/readOnly';
import { renderKatexInto } from '../katexRender';
import { LatexEditPopover } from '../LatexEditPopover';
import {
  computeLatexPopoverPlacement,
  isLatexPopoverAnchorMeasurable,
} from '../LatexEditPopover/latexPopoverGeometry';
import { useFocusPopoverTextarea } from '../LatexEditPopover/useFocusPopoverTextarea';
import { useLatexPopoverAnchorSync } from '../LatexEditPopover/useLatexPopoverAnchorSync';
import { sanitizeLatexInput } from '../latexInput';
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

function InlineMathFormulaPreview({
  expression,
  className,
}: {
  expression: string;
  className: string;
}) {
  const mathRef = useRef<HTMLSpanElement>(null);

  /**
   * @wisepen-manual-effect
   * 执行时机：行内公式表达式变化后重新渲染 KaTeX DOM。
   * 不可替代原因：KaTeX 通过命令式 API 写入真实 DOM，不能由 React JSX 直接表达。
   * cleanup：下一次渲染会覆盖旧内容，没有订阅或异步任务需要清理。
   */
  useEffect(() => {
    const el = mathRef.current;
    if (!el) return;
    renderKatexInto(el, expression, popoverStyles.mathPlaceholder, false);
  }, [expression]);

  return <span ref={mathRef} className={className} />;
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
  const { t } = useTranslation('note');
  const { contentRef, updateInlineContent, inlineContent, editor } = props;
  const readOnly = useNoteEditorReadOnlyContext();
  const expression = inlineContent.props.expression as string;
  const autoOpenEdit = inlineContent.props.autoOpenEdit as boolean;
  const inlineContentPropsLatest = useLatest(inlineContent.props);
  const updateInlineContentLatest = useLatest(updateInlineContent);

  const [isEditing, setIsEditing] = useState(false);
  const isEditingRef = useRef(false);
  const [value, setValue] = useState(expression);
  const shellRef = useRef<HTMLSpanElement | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textareaBlurTimerRef = useRef<number | null>(null);
  const [popoverPos, setPopoverPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const clearPopoverPos = () => {
    setPopoverPos(null);
  };

  const measurePopoverPosition = () => {
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
  };

  useLatexPopoverAnchorSync(isEditing, shellRef, measurePopoverPosition, clearPopoverPos);

  const canEnterEdit = !readOnly && !isEditing;

  const displayLatex = isEditing ? value : expression;

  /**
   * @wisepen-manual-effect
   * 执行时机：BlockNote 插件把 autoOpenEdit 置为 true 后拉起一次公式编辑。
   * 不可替代原因：该标记来自编辑器外部文档状态，还需用命令式事务消费并复位。
   * cleanup：取消尚未消费 autoOpenEdit 的 animation frame。
   */
  useEffect(() => {
    if (readOnly) return;
    if (!autoOpenEdit) return;
    const inlineContentProps = inlineContentPropsLatest.current;
    const openExpr = sanitizeLatexInput(inlineContentProps.expression as string);
    const frame = window.requestAnimationFrame(() => {
      updateInlineContentLatest.current({
        type: 'inlineMath',
        props: {
          ...inlineContentProps,
          expression: openExpr,
          autoOpenEdit: false,
        },
      });
      setValue(openExpr);
      isEditingRef.current = true;
      setIsEditing(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [autoOpenEdit, inlineContentPropsLatest, readOnly, updateInlineContentLatest]);

  useFocusPopoverTextarea(isEditing, popoverPos, inputRef);

  const cancel = () => {
    if (!isEditingRef.current) return;
    isEditingRef.current = false;
    if (textareaBlurTimerRef.current !== null) {
      clearTimeout(textareaBlurTimerRef.current);
      textareaBlurTimerRef.current = null;
    }
    setValue(expression);
    setIsEditing(false);
  };

  const commit = () => {
    if (!isEditingRef.current) return;
    isEditingRef.current = false;
    if (textareaBlurTimerRef.current !== null) {
      clearTimeout(textareaBlurTimerRef.current);
      textareaBlurTimerRef.current = null;
    }
    updateInlineContent({
      type: 'inlineMath',
      props: {
        ...inlineContent.props,
        expression: sanitizeLatexInput(value).trim(),
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
    setValue(sanitizeLatexInput(expression));
    isEditingRef.current = true;
    setIsEditing(true);
  };

  const setShellRef = (el: HTMLSpanElement | null) => {
    shellRef.current = el;
    contentRef(el);
  };

  const editPopover = (
    <LatexEditPopover
      visible={Boolean(isEditing && popoverPos)}
      position={popoverPos}
      title={t('latex.inlineTitle')}
      hint={t('latex.inlineHint')}
      textareaClassName={popoverStyles.inlineEditTextarea}
      value={value}
      onValueChange={(nextValue) => setValue(nextValue.replace(/\n/g, ''))}
      onCommit={commit}
      onOutsidePress={commit}
      commitEnterUnlessShift={false}
      onCancel={cancel}
      onBlur={handleTextareaBlur}
      rows={2}
      inputRef={inputRef}
      rootRef={popoverRef}
      anchorRef={shellRef}
    />
  );

  return (
    <span
      ref={setShellRef}
      className={`${popoverStyles.mathShellInline} bn-inline-math-root`}
      contentEditable={false}
    >
      <span
        className={
          canEnterEdit
            ? popoverStyles.mathRootInline
            : `${popoverStyles.mathRootInline} ${popoverStyles.mathRootInlineReadonly}`
        }
        role={canEnterEdit ? 'button' : undefined}
        tabIndex={canEnterEdit ? 0 : -1}
        aria-readonly={readOnly || undefined}
        aria-label={canEnterEdit ? t('latex.inlineEdit') : undefined}
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
          expression={displayLatex}
          className={popoverStyles.mathPreviewInline}
        />
      </span>
      {editPopover}
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
