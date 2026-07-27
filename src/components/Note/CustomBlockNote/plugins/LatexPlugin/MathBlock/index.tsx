/* eslint-disable react-refresh/only-export-components -- BlockNote block spec 与展示组件同文件 */
import type {
  BlockConfig,
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from '@blocknote/core';
import { createReactBlockSpec } from '@blocknote/react';
import 'katex/dist/katex.min.css';
import type { ComponentType } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNoteEditorReadOnlyContext } from '../../../engines/editor/readOnly';
import popoverStyles from '../InlineMath/style.module.less';
import { renderKatexInto } from '../katexRender';
import { LatexEditPopover } from '../LatexEditPopover';
import {
  computeLatexPopoverPlacement,
  isLatexPopoverAnchorMeasurable,
} from '../LatexEditPopover/latexPopoverGeometry';
import { useFocusPopoverTextarea } from '../LatexEditPopover/useFocusPopoverTextarea';
import { useLatexPopoverAnchorSync } from '../LatexEditPopover/useLatexPopoverAnchorSync';
import { sanitizeLatexInput } from '../latexInput';
import styles from './style.module.less';

const mathBlockPropSchema = {
  expression: {
    default: '',
  },
  autoEdit: {
    default: false,
  },
} as const;

const mathBlockConfig: BlockConfig<'math', typeof mathBlockPropSchema, 'none'> = {
  type: 'math',
  propSchema: mathBlockPropSchema,
  content: 'none',
};

type MathBlockProps = {
  expression: string;
  autoEdit: boolean;
};
type MathBlockData = {
  id: string;
  props: MathBlockProps;
  children: unknown[];
};
type MathBlockRenderProps = {
  block: MathBlockData;
  editor: BlockNoteEditor<Record<'math', BlockConfig<'math', typeof mathBlockPropSchema, 'none'>>>;
  contentRef: (node: HTMLElement | null) => void;
};
function MathFormulaPreview({ expression, className }: { expression: string; className: string }) {
  const mathRef = useRef<HTMLDivElement>(null);

  /**
   * @wisepen-manual-effect
   * 执行时机：块级公式表达式变化后重新渲染 KaTeX DOM。
   * 不可替代原因：KaTeX 通过命令式 API 写入真实 DOM，不能由 React JSX 直接表达。
   * cleanup：下一次渲染会覆盖旧内容，没有订阅或异步任务需要清理。
   */
  useEffect(() => {
    const el = mathRef.current;
    if (!el) return;
    renderKatexInto(el, expression, styles.mathPlaceholder, true);
  }, [expression]);

  return <div ref={mathRef} className={className} />;
}

function MathBlockView(props: MathBlockRenderProps) {
  const { t } = useTranslation('note');
  const readOnly = useNoteEditorReadOnlyContext();
  const [isEditing, setIsEditing] = useState(false);
  const isEditingRef = useRef(false);
  const [value, setValue] = useState(props.block.props.expression);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const openValueRef = useRef(props.block.props.expression);
  const blurCommitTimerRef = useRef<number | null>(null);
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
    if (!isLatexPopoverAnchorMeasurable(r)) {
      return false;
    }
    const minW = 280;
    const maxW = 480;
    const estHeight = 220;
    setPopoverPos(computeLatexPopoverPlacement(r, { minWidth: minW, maxWidth: maxW, estHeight }));
    return true;
  };

  useLatexPopoverAnchorSync(isEditing, shellRef, measurePopoverPosition, clearPopoverPos);

  useFocusPopoverTextarea(isEditing, popoverPos, inputRef);

  /**
   * @wisepen-manual-effect
   * 执行时机：BlockNote 块属性把 autoEdit 置为 true 后拉起一次公式编辑。
   * 不可替代原因：该标记来自编辑器外部文档状态，还需用命令式事务消费并复位。
   * cleanup：取消尚未消费 autoEdit 的 animation frame。
   */
  useEffect(() => {
    if (readOnly) return;
    if (!props.block.props.autoEdit) return;
    const frame = window.requestAnimationFrame(() => {
      openValueRef.current = sanitizeLatexInput(props.block.props.expression);
      setValue(openValueRef.current);
      isEditingRef.current = true;
      setIsEditing(true);
      props.editor.updateBlock(props.block, {
        props: { ...props.block.props, autoEdit: false },
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [props.block, props.block.props, props.editor, readOnly]);

  const focusStartOfBlockAfterMath = () => {
    const { editor, block } = props;
    // 渲染上下文里 editor 的 schema 仅包含 math，自身无法直接 `insertBlocks([{type:'paragraph'}])`。
    // 这里向 BlockNote 顶层 editor 类型放宽，便于复用默认块（paragraph）。
    const ed = editor as unknown as BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>;
    const next = ed.getNextBlock(block);
    try {
      if (next) {
        ed.setTextCursorPosition(next.id, 'start');
      } else {
        const inserted = ed.insertBlocks([{ type: 'paragraph' }], block, 'after');
        const first = inserted[0];
        if (first) {
          ed.setTextCursorPosition(first.id, 'start');
        }
      }
      ed.focus();
    } catch {
      ed.focus();
    }
  };

  const scheduleCancelBlurCommitAndFocusNext = () => {
    window.setTimeout(() => {
      if (blurCommitTimerRef.current !== null) {
        clearTimeout(blurCommitTimerRef.current);
        blurCommitTimerRef.current = null;
      }
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          focusStartOfBlockAfterMath();
        });
      });
    }, 0);
  };

  const commit = (focusNextLine = false) => {
    if (!isEditingRef.current) return;
    isEditingRef.current = false;
    props.editor.updateBlock(props.block, {
      props: { ...props.block.props, expression: sanitizeLatexInput(value).trim() },
    });
    if (focusNextLine) {
      scheduleCancelBlurCommitAndFocusNext();
    }
    setIsEditing(false);
  };

  const cancel = () => {
    if (!isEditingRef.current) return;
    isEditingRef.current = false;
    if (blurCommitTimerRef.current !== null) {
      clearTimeout(blurCommitTimerRef.current);
      blurCommitTimerRef.current = null;
    }
    window.setTimeout(() => {
      if (blurCommitTimerRef.current !== null) {
        clearTimeout(blurCommitTimerRef.current);
        blurCommitTimerRef.current = null;
      }
    }, 0);
    setValue(openValueRef.current);
    setIsEditing(false);
  };

  const enterEdit = () => {
    if (readOnly) return;
    openValueRef.current = sanitizeLatexInput(props.block.props.expression);
    setValue(openValueRef.current);
    isEditingRef.current = true;
    setIsEditing(true);
  };

  const handleTextareaBlur = () => {
    if (blurCommitTimerRef.current !== null) {
      clearTimeout(blurCommitTimerRef.current);
    }
    blurCommitTimerRef.current = window.setTimeout(() => {
      blurCommitTimerRef.current = null;
      const shell = shellRef.current;
      const pop = popoverRef.current;
      const active = document.activeElement;
      if (shell && active && shell.contains(active)) return;
      if (pop && active && pop.contains(active)) return;
      commit();
    }, 0);
  };

  const shellClass = `${styles.mathShell} ${styles.mathShellBlock}`;
  const previewClass = styles.mathPreview;
  const editTitle = t('latex.blockTitle');
  const canEnterEdit = !readOnly && !isEditing;
  const rootClass = canEnterEdit
    ? styles.mathRoot
    : `${styles.mathRoot} ${styles.mathRootReadonly}`;

  const editPopover = (
    <LatexEditPopover
      visible={Boolean(isEditing && popoverPos)}
      position={popoverPos}
      title={editTitle}
      hint={t('latex.blockHint')}
      textareaClassName={`${popoverStyles.inlineEditTextarea} ${styles.blockPopoverTextarea}`}
      value={value}
      onValueChange={setValue}
      onCommit={() => commit(true)}
      onOutsidePress={() => commit()}
      commitEnterUnlessShift
      onCancel={cancel}
      onBlur={handleTextareaBlur}
      rows={3}
      inputRef={inputRef}
      rootRef={popoverRef}
      anchorRef={shellRef}
    />
  );

  return (
    <div ref={shellRef} contentEditable={false} className={`${shellClass} bn-math-block-root`}>
      <div
        className={rootClass}
        role={canEnterEdit ? 'button' : undefined}
        tabIndex={canEnterEdit ? 0 : -1}
        aria-label={canEnterEdit ? t('latex.blockEdit') : undefined}
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
        <MathFormulaPreview
          expression={isEditing ? value : props.block.props.expression}
          className={previewClass}
        />
      </div>
      {editPopover}
    </div>
  );
}

type MathBlockExternalProps = MathBlockRenderProps & {
  context: { nestingLevel: number };
};

type MathBlockSpec = ReturnType<ReturnType<typeof createReactBlockSpec>>;
const createMathBlockSpecUnsafe = createReactBlockSpec as unknown as (
  blockConfig: typeof mathBlockConfig,
  blockImplementation: {
    render: ComponentType<MathBlockRenderProps>;
    toExternalHTML: ComponentType<MathBlockExternalProps>;
  }
) => () => MathBlockSpec;

/** Markdown / 外部 HTML：行间公式 `$$\n...\n$$`，避免使用编辑器内 KaTeX DOM */
function MathBlockToExternalHTML(props: MathBlockExternalProps) {
  void props.context;
  const expr = String(props.block.props.expression ?? '').trim();
  const payload = expr === '' ? '$$\n\n$$' : `$$\n${expr}\n$$`;
  return (
    <div className={`${styles.mathExportRoot} bn-math-block-export-md`} contentEditable={false}>
      {payload}
    </div>
  );
}

/** KaTeX 独立公式块；预览在文档内，编辑区与行内公式一致为 body 挂载的浮层 */
export const createMathBlockSpec = createMathBlockSpecUnsafe(mathBlockConfig, {
  render: MathBlockView as ComponentType<MathBlockRenderProps>,
  toExternalHTML: MathBlockToExternalHTML as ComponentType<MathBlockExternalProps>,
});
