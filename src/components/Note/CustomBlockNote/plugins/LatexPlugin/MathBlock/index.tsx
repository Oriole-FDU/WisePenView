/* eslint-disable react-refresh/only-export-components -- BlockNote block spec 与展示组件同文件 */
import type {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from '@blocknote/core';
import { createReactBlockSpec, type ReactCustomBlockRenderProps } from '@blocknote/react';
import { useCallback, useRef, useState } from 'react';

import { AI_DIFF_DISPLAY_MODE, type AiDiffDisplayMode } from '@/domains/Note';
import { useEffectForce } from '@/hooks/useEffectForce';
import 'katex/dist/katex.min.css';
import { useAiDiffDisplayModeContext } from '../../AIDiffPlugin/displayModeContext';
import aiDiffStyles from '../../AIDiffPlugin/style.module.less';
import popoverStyles from '../InlineMath/style.module.less';
import { renderKatexInto } from '../katexRender';
import { LatexEditPopover } from '../LatexEditPopover';
import {
  computeLatexPopoverPlacement,
  isLatexPopoverAnchorMeasurable,
} from '../LatexEditPopover/latexPopoverGeometry';
import { useFocusPopoverTextarea } from '../LatexEditPopover/useFocusPopoverTextarea';
import { useLatexPopoverAnchorSync } from '../LatexEditPopover/useLatexPopoverAnchorSync';
import styles from './style.module.less';

const mathBlockPropSchema = {
  expression: {
    default: '',
  },
  autoEdit: {
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
} as const;

type MathBlockRenderProps = ReactCustomBlockRenderProps<'math', typeof mathBlockPropSchema, 'none'>;
type MathAiDiffActionMode = 'accept' | 'discard';
type MathAiDiffViewMode = 'hidden' | 'plain' | 'compare';

type MathBlockEditor = BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema> & {
  removeBlocks?: (blocks: readonly unknown[]) => void;
};

type MathAiDiffResolvedView = {
  mode: MathAiDiffViewMode;
  plainExpression: string;
  origin: string;
  replace: string;
  hasDiff: boolean;
};

function MathFormulaPreview({ expression, className }: { expression: string; className: string }) {
  const mathRef = useRef<HTMLDivElement>(null);

  useEffectForce(() => {
    const el = mathRef.current;
    if (!el) return;
    renderKatexInto(el, expression, styles.mathPlaceholder, true);
  }, [expression]);

  return <div ref={mathRef} className={className} />;
}

function resolveMathAiDiffViewState(params: {
  displayMode: AiDiffDisplayMode;
  expression: string;
  aiDiffType: string;
  origin: string;
  replace: string;
}): MathAiDiffResolvedView {
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

function clearMathAiDiffProps(props: MathBlockRenderProps['block']['props']) {
  return {
    ...props,
    aiDiffType: '',
    aiDiffKey: '',
    aiDiffOrigin: '',
    aiDiffReplace: '',
  };
}

function MathDiffActionButtons({ onApply }: { onApply: (mode: MathAiDiffActionMode) => void }) {
  return (
    <span
      className={`${aiDiffStyles.aiActionsAnchor} ${styles.mathDiffActions}`}
      aria-hidden="true"
    >
      <span
        className={`${aiDiffStyles.aiActionsRoot} ${styles.mathDiffActionsRoot}`}
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

function MathBlockView(props: MathBlockRenderProps) {
  const aiDiffDisplayMode = useAiDiffDisplayModeContext();

  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(props.block.props.expression);
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

  // TODO: 重构，不使用useEffect，使用更合适的语义以增加可读性，但是latexSupport有完全重构的可能，因此暂时保留
  useEffectForce(() => {
    if (isEditing) return;
    setValue(props.block.props.expression);
  }, [props.block.props.expression, isEditing]);

  useFocusPopoverTextarea(isEditing, popoverPos, inputRef);

  useEffectForce(() => {
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
  const previewClass = styles.mathPreview;
  const editTitle = '编辑 LaTeX（独立）';
  const aiDiffType = String(props.block.props.aiDiffType ?? '');
  const aiDiffOrigin = String(props.block.props.aiDiffOrigin ?? '');
  const aiDiffReplace = String(props.block.props.aiDiffReplace ?? '');
  const viewState = resolveMathAiDiffViewState({
    displayMode: aiDiffDisplayMode,
    expression: props.block.props.expression,
    aiDiffType,
    origin: aiDiffOrigin,
    replace: aiDiffReplace,
  });
  const hasPendingAiDiff = viewState.hasDiff;
  const canEnterEdit = !hasPendingAiDiff && !isEditing;
  const rootClass = canEnterEdit
    ? styles.mathRoot
    : `${styles.mathRoot} ${styles.mathRootReadonly}`;

  const applyAiDiffAction = useCallback(
    (mode: MathAiDiffActionMode) => {
      const editor = props.editor as unknown as MathBlockEditor;
      const baseProps = clearMathAiDiffProps(props.block.props);

      if (aiDiffType === 'create') {
        if (mode === 'accept') {
          props.editor.updateBlock(props.block, {
            props: { ...baseProps, expression: aiDiffReplace },
          });
        } else {
          editor.removeBlocks?.([props.block]);
        }
        editor.focus();
        return;
      }

      if (aiDiffType === 'delete') {
        if (mode === 'accept') {
          editor.removeBlocks?.([props.block]);
        } else {
          props.editor.updateBlock(props.block, {
            props: { ...baseProps, expression: aiDiffOrigin },
          });
        }
        editor.focus();
        return;
      }

      const nextExpression = mode === 'accept' ? aiDiffReplace : aiDiffOrigin;
      props.editor.updateBlock(props.block, {
        props: { ...baseProps, expression: nextExpression },
      });
      editor.focus();
    },
    [aiDiffOrigin, aiDiffReplace, aiDiffType, props.block, props.editor]
  );

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
      {viewState.mode === 'hidden' ? (
        <div className={styles.mathHiddenShell} aria-hidden="true" />
      ) : null}
      {viewState.mode === 'plain' ? (
        <div
          className={rootClass}
          role={canEnterEdit ? 'button' : undefined}
          tabIndex={canEnterEdit ? 0 : -1}
          aria-label={canEnterEdit ? '编辑独立公式' : undefined}
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
            expression={isEditing ? value : viewState.plainExpression}
            className={previewClass}
          />
        </div>
      ) : null}
      {viewState.mode === 'compare' ? (
        <div
          className={`${styles.mathRoot} ${styles.mathRootReadonly} ${styles.mathDiffCompare} ${aiDiffStyles.aiDiffRoot}`}
        >
          {viewState.origin ? (
            <div className={`${styles.mathDiffCard} ${styles.mathDiffDelete}`}>
              <MathFormulaPreview expression={viewState.origin} className={previewClass} />
            </div>
          ) : null}
          {viewState.replace ? (
            <div className={`${styles.mathDiffCard} ${styles.mathDiffAdd}`}>
              <MathFormulaPreview expression={viewState.replace} className={previewClass} />
            </div>
          ) : null}
          <span className={styles.mathDiffActionLayer}>
            <MathDiffActionButtons onApply={applyAiDiffAction} />
          </span>
        </div>
      ) : null}
      {!hasPendingAiDiff ? editPopover : null}
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
