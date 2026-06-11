import { MessageSquare } from 'lucide-react';
import type { RefObject } from 'react';

import { useLatexComment } from './latexCommentContext';
import type { FormulaCommentKind } from './latexCommentSupport';
import styles from './latexFormulaCommentButton.module.less';

type LatexFormulaCommentButtonProps = {
  expression: string;
  kind: FormulaCommentKind;
  shellRef: RefObject<HTMLElement | null>;
  blockId?: string;
  className?: string;
};

export function LatexFormulaCommentButton({
  expression,
  kind,
  shellRef,
  blockId,
  className,
}: LatexFormulaCommentButtonProps) {
  const latexComment = useLatexComment();

  if (!latexComment?.canComment) {
    return null;
  }

  return (
    <button
      type="button"
      className={`${styles.formulaCommentButton} ${className ?? ''}`.trim()}
      title="添加批注"
      aria-label="添加批注"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const shellElement = shellRef.current;
        if (!shellElement) {
          return;
        }
        latexComment.startFormulaComment({
          expression,
          kind,
          shellElement,
          blockId,
        });
      }}
    >
      <MessageSquare size={14} />
    </button>
  );
}
