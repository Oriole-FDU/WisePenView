/* eslint-disable react-refresh/only-export-components -- BlockNote block spec 与展示组件同文件 */
/* eslint-disable react-hooks/set-state-in-effect -- 浮层定位与随 block props 同步草稿态需要 effect 内 setState（与 InlineMath 一致） */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createReactBlockSpec, type ReactCustomBlockRenderProps } from '@blocknote/react';

import type { CustomBlockNoteEditor } from '../../blockNoteSchema';
import { LatexEditPopover } from '../LatexEditPopover';
import {
  computeLatexPopoverPlacement,
  isLatexPopoverAnchorMeasurable,
} from '../latexPopoverGeometry';
import popoverStyles from '../InlineMath/style.module.less';
import { renderKatexInto } from '../katexRender';
import { useFocusPopoverTextarea } from '../useFocusPopoverTextarea';
import { useLatexPopoverAnchorSync } from '../useLatexPopoverAnchorSync';
import styles from './style.module.less';

import 'katex/dist/katex.min.css';

const mathBlockPropSchema = {
  expression: {
    default: '',
  },
  autoEdit: {
    default: false,
  },
} as const;

type MathBlockRenderProps = ReactCustomBlockRenderProps<'math', typeof mathBlockPropSchema, 'none'>;

function MathBlockView(props: MathBlockRenderProps) {
  const displayMode = true;

  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(props.block.props.expression);
  const mathRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const openValueRef = useRef(props.block.props.expression);
  const blurCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (!isLatexPopoverAnchorMeasurable(r)) {
      return false;
    }
    const minW = 280;
    const maxW = 480;
    const estHeight = 220;
    setPopoverPos(computeLatexPopoverPlacement(r, { minWidth: minW, maxWidth: maxW, estHeight }));
    return true;
  }, []);

  useLatexPopoverAnchorSync(isEditing, shellRef, measurePopoverPosition, clearPopoverPos);

  useEffect(() => {
    if (isEditing) return;
    setValue(props.block.props.expression);
  }, [props.block.props.expression, isEditing]);

  const displayLatex = isEditing ? value : props.block.props.expression;

  useEffect(() => {
    const el = mathRef.current;
    if (!el) return;
    renderKatexInto(el, displayLatex, styles.mathPlaceholder, displayMode);
  }, [displayLatex, displayMode]);

  useFocusPopoverTextarea(isEditing, popoverPos, inputRef);

  useEffect(() => {
    if (!props.block.props.autoEdit) return;
    openValueRef.current = props.block.props.expression;
    setValue(props.block.props.expression);
    setIsEditing(true);
    props.editor.updateBlock(props.block, {
      props: { ...props.block.props, autoEdit: false },
    });
  }, [props.block, props.block.props, props.editor]);

  const focusStartOfBlockAfterMath = () => {
    const { editor, block } = props;
    const ed = editor as CustomBlockNoteEditor;
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
    props.editor.updateBlock(props.block, {
      props: { ...props.block.props, expression: value.trim() },
    });
    if (focusNextLine) {
      scheduleCancelBlurCommitAndFocusNext();
    }
    setIsEditing(false);
  };

  const cancel = () => {
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
    openValueRef.current = props.block.props.expression;
    setValue(props.block.props.expression);
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
  const rootClass = styles.mathRoot;
  const previewClass = styles.mathPreview;
  const editTitle = '编辑 LaTeX（独立）';

  const editPopover = (
    <LatexEditPopover
      visible={Boolean(isEditing && popoverPos)}
      position={popoverPos}
      title={editTitle}
      hint="Enter 确定 · Shift+Enter 换行 · Esc 取消"
      textareaClassName={`${popoverStyles.inlineEditTextarea} ${styles.blockPopoverTextarea}`}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onCommit={() => commit(true)}
      commitEnterUnlessShift
      onCancel={cancel}
      onBlur={handleTextareaBlur}
      rows={3}
      inputRef={inputRef}
      rootRef={popoverRef}
    />
  );

  return (
    <div ref={shellRef} contentEditable={false} className={`${shellClass} bn-math-block-root`}>
      <div
        className={rootClass}
        role="button"
        tabIndex={isEditing ? -1 : 0}
        aria-label={isEditing ? undefined : '编辑独立公式'}
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
        <div ref={mathRef} className={previewClass} />
      </div>
      {editPopover}
    </div>
  );
}

/** KaTeX 独立公式块；预览在文档内，编辑区与行内公式一致为 body 挂载的浮层 */
export const createMathBlockSpec = createReactBlockSpec(
  {
    type: 'math',
    propSchema: mathBlockPropSchema,
    content: 'none',
  },
  { render: MathBlockView }
);
