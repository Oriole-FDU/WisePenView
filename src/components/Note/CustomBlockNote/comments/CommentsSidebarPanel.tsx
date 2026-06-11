import clsx from 'clsx';
import type { CSSProperties, ReactNode } from 'react';

import styles from './commentStyles.module.less';
import { MIN_COMMENTS_SIDEBAR_WIDTH, useCommentsSidebarResize } from './useCommentsSidebarResize';

export type CommentsSidebarPanelProps = {
  width: number;
  onWidthChange: (width: number) => void;
  children: ReactNode;
  className?: string;
};

export function CommentsSidebarPanel({
  width,
  onWidthChange,
  children,
  className,
}: CommentsSidebarPanelProps) {
  const { resizing, onResizeStart } = useCommentsSidebarResize({ width, onWidthChange });

  const panelStyle = {
    ['--comments-sidebar-width' as string]: `${width}px`,
    ['--comments-sidebar-min-width' as string]: `${MIN_COMMENTS_SIDEBAR_WIDTH}px`,
  } as CSSProperties;

  return (
    <div
      className={clsx(
        'wise-pen-comments-sidebar-panel',
        styles.threadsSidebarPanel,
        styles.threadsSidebarSurface,
        resizing && styles.threadsSidebarPanelResizing,
        className
      )}
      style={panelStyle}
    >
      <button
        type="button"
        className={styles.threadsSidebarResizeHandle}
        aria-label="调整批注栏宽度"
        onMouseDown={onResizeStart}
      />
      {children}
    </div>
  );
}
