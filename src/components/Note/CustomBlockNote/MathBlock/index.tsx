import { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import { createReactBlockSpec } from '@blocknote/react';

import type { CustomBlockNoteEditor } from '../BlockSchema/blockNoteSchema';
import styles from './style.module.less';

import 'katex/dist/katex.min.css';

export type MathBlockVariant = 'inline' | 'block';

function renderKatexInto(
  el: HTMLDivElement,
  latex: string,
  placeholderClass: string,
  displayMode: boolean
): void {
  el.replaceChildren();
  const trimmed = latex.trim();
  if (!trimmed) {
    const span = document.createElement('span');
    span.className = placeholderClass;
    span.textContent = '点击输入公式...';
    el.appendChild(span);
    return;
  }
  try {
    katex.render(latex, el, { throwOnError: false, displayMode });
  } catch {
    el.textContent = latex;
  }
}

/** KaTeX 公式块：支持行内（inline）与独立块（block）两种展示；主区域预览 + 下方浮层编辑 */
export const createMathBlockSpec = createReactBlockSpec(
  {
    type: 'math',
    propSchema: {
      expression: {
        default: '',
      },
      variant: {
        default: 'block',
        values: ['inline', 'block'],
      },
      autoEdit: {
        default: false,
      },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const variant = props.block.props.variant as MathBlockVariant;
      const displayMode = variant === 'block';

      const [isEditing, setIsEditing] = useState(false);
      const [value, setValue] = useState(props.block.props.expression);
      const mathRef = useRef<HTMLDivElement>(null);
      const inputRef = useRef<HTMLTextAreaElement>(null);
      const shellRef = useRef<HTMLDivElement>(null);
      const openValueRef = useRef(props.block.props.expression);
      /** textarea blur 时用 setTimeout(0) 延迟 commit；Enter/Esc 关闭时要取消该定时器，否则会二次 commit 打乱焦点 */
      const blurCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      useEffect(() => {
        if (!isEditing) return;
        const id = window.requestAnimationFrame(() => {
          const el = inputRef.current;
          if (!el) return;
          el.focus();
          const len = el.value.length;
          el.setSelectionRange(len, len);
        });
        return () => window.cancelAnimationFrame(id);
      }, [isEditing]);

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
        // createReactBlockSpec 将 editor 收窄为仅 math；导航/插入默认块需按全文 schema 断言
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

      /**
       * 在 setIsEditing(false) 之前入队：须排在 textarea blur 所设的 setTimeout 之后执行，
       * 回调里 clearTimeout 取消 blur 触发的二次 commit；再双 rAF 等 React 卸掉浮层、PM 更新后再移光标，
       * 否则易出现小框关了但光标仍留在公式块上的问题。
       */
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

      /** @param focusNextLine 为 true 时（Enter 确定）关闭浮层后光标移到下一块开头 */
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
        // 与 commit(true) 同理：先入队 macrotask，卸载 textarea 时 blur 排的 commit 定时器排在后面，再被清掉，避免把未恢复的 value 写回块
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

      const handleEditorBlur = () => {
        if (blurCommitTimerRef.current !== null) {
          clearTimeout(blurCommitTimerRef.current);
        }
        blurCommitTimerRef.current = window.setTimeout(() => {
          blurCommitTimerRef.current = null;
          const root = shellRef.current;
          const active = document.activeElement;
          if (root && active && root.contains(active)) return;
          commit();
        }, 0);
      };

      const shellClass =
        variant === 'inline'
          ? `${styles.mathShell} ${styles.mathShellInline}`
          : `${styles.mathShell} ${styles.mathShellBlock}`;

      const rootClass =
        variant === 'inline' ? `${styles.mathRoot} ${styles.mathRootInline}` : styles.mathRoot;

      const previewClass =
        variant === 'inline'
          ? `${styles.mathPreview} ${styles.mathPreviewInline}`
          : styles.mathPreview;

      const editTitle = variant === 'inline' ? '编辑 LaTeX（行内）' : '编辑 LaTeX（独立）';

      return (
        <div ref={shellRef} contentEditable={false} className={`${shellClass} bn-math-block-root`}>
          <div
            className={rootClass}
            role="button"
            tabIndex={isEditing ? -1 : 0}
            aria-label={
              isEditing ? undefined : variant === 'inline' ? '编辑行内公式' : '编辑独立公式'
            }
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

          {isEditing ? (
            <div className={styles.editFloat}>
              <div className={styles.editFloatHeader}>{editTitle}</div>
              <textarea
                ref={inputRef}
                className={styles.editTextarea}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    cancel();
                    return;
                  }
                  if ((e.key === 'Enter' || e.key === 'NumpadEnter') && !e.shiftKey) {
                    e.preventDefault();
                    commit(true);
                  }
                }}
                onBlur={handleEditorBlur}
                rows={variant === 'inline' ? 2 : 3}
                spellCheck={false}
                autoComplete="off"
                aria-label="LaTeX 源码"
              />
              <div className={styles.editFloatHint}>Enter 确定 · Shift+Enter 换行 · Esc 取消</div>
            </div>
          ) : null}
        </div>
      );
    },
  }
);
