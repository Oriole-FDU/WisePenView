import { useUpdateEffect } from 'ahooks';
import { useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

import {
  DEFAULT_COMMENTS_SIDEBAR_WIDTH,
  MAX_COMMENTS_SIDEBAR_WIDTH,
  MIN_COMMENTS_SIDEBAR_WIDTH,
  normalizeCommentsSidebarWidth,
} from '@/store/noteCommentsSidebarConfig';

export interface UseCommentsSidebarResizeOptions {
  width: number;
  onWidthChange: (width: number) => void;
}

export interface UseCommentsSidebarResizeResult {
  resizing: boolean;
  onResizeStart: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

/** 批注侧栏左缘拖拽调宽（向右拖变窄，向左拖变宽） */
export function useCommentsSidebarResize({
  width,
  onWidthChange,
}: UseCommentsSidebarResizeOptions): UseCommentsSidebarResizeResult {
  const widthRef = useRef(width);
  const [resizing, setResizing] = useState(false);

  useUpdateEffect(() => {
    widthRef.current = width;
  }, [width]);

  const onResizeStart = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = widthRef.current;
    let pendingWidth = startWidth;

    setResizing(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      pendingWidth = normalizeCommentsSidebarWidth(startWidth + deltaX);
      onWidthChange(pendingWidth);
    };

    const handleMouseUp = () => {
      onWidthChange(pendingWidth);
      setResizing(false);
      document.body.style.removeProperty('user-select');
      document.body.style.removeProperty('cursor');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return { resizing, onResizeStart };
}

export {
  DEFAULT_COMMENTS_SIDEBAR_WIDTH,
  MAX_COMMENTS_SIDEBAR_WIDTH,
  MIN_COMMENTS_SIDEBAR_WIDTH,
  normalizeCommentsSidebarWidth,
};
