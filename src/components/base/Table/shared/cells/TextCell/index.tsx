import { Tooltip } from '@heroui/react';
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';

import { tableCellStyles } from '../../styles';
import { joinClassNames, resolveColumnAlign, useTableColumnAlign } from '../../TableBase/cellAlign';
import type { TableTextCellProps } from './index.type';
import styles from './style.module.less';

function resolveTextTitle(children: ReactNode, title?: string): string | undefined {
  if (title !== undefined) {
    return title;
  }
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }
  return undefined;
}

function TableTextCell({ children, title, className, align, emphasis, muted }: TableTextCellProps) {
  const columnAlign = useTableColumnAlign();
  const resolvedAlign = resolveColumnAlign(align ?? columnAlign);
  const textRef = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);
  const resolvedTitle = resolveTextTitle(children, title);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) {
      return undefined;
    }

    const updateTruncation = () => {
      setTruncated(element.scrollWidth > element.clientWidth);
    };

    updateTruncation();
    const observer = new ResizeObserver(updateTruncation);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children, resolvedTitle]);

  const textClassName = joinClassNames(
    emphasis
      ? tableCellStyles.cellEmphasis
      : muted
        ? tableCellStyles.cellMuted
        : tableCellStyles.cellEllipsis,
    resolvedAlign === 'end'
      ? tableCellStyles.cellTextAlignEnd
      : resolvedAlign === 'center'
        ? tableCellStyles.cellTextAlignCenter
        : undefined,
    className
  );

  const textNode = (
    <span ref={textRef} className={textClassName} title={truncated ? resolvedTitle : undefined}>
      {children}
    </span>
  );

  if (!resolvedTitle || !truncated) {
    return textNode;
  }

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <span className={styles.triggerHost}>{textNode}</span>
      </Tooltip.Trigger>
      <Tooltip.Content>{resolvedTitle}</Tooltip.Content>
    </Tooltip>
  );
}

export default TableTextCell;
