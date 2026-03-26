import { type RefObject, useLayoutEffect } from 'react';

import { LATEX_POPOVER_RAF_MAX_RETRIES } from './latexPopoverGeometry';

/**
 * 编辑态为 true 时：监听 resize / scroll(capture) / ResizeObserver，并在首帧用 rAF 重试直至 measure 返回 true。
 * 编辑态为 false 时：调用 onInactive（通常为清空浮层坐标）。
 */
export function useLatexPopoverAnchorSync(
  isEditing: boolean,
  shellRef: RefObject<HTMLElement | null>,
  measure: () => boolean,
  onInactive: () => void
): void {
  useLayoutEffect(() => {
    if (!isEditing) {
      onInactive();
      return;
    }

    let rafId = 0;
    let cancelled = false;
    const sync = () => {
      if (cancelled) return;
      measure();
    };

    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);

    const el = shellRef.current;
    let ro: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        sync();
      });
      ro.observe(el);
    }

    let retries = 0;
    const tryMeasure = () => {
      if (cancelled) return;
      if (measure()) {
        return;
      }
      retries += 1;
      if (retries < LATEX_POPOVER_RAF_MAX_RETRIES) {
        rafId = window.requestAnimationFrame(tryMeasure);
      }
    };
    tryMeasure();

    return () => {
      cancelled = true;
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
      ro?.disconnect();
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
    };
  }, [isEditing, measure, onInactive, shellRef]);
}
