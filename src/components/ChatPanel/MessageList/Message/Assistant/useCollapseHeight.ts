import { useLayoutEffect, useRef } from 'react';

const COLLAPSE_MS = 200;
const COLLAPSE_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

export function useCollapseHeight(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  const initializedRef = useRef(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!initializedRef.current) {
      initializedRef.current = true;
      openRef.current = open;
      el.style.overflow = 'hidden';
      el.style.height = open ? 'auto' : '0px';
      el.style.transition = 'none';
      return;
    }

    if (openRef.current === open) return;
    openRef.current = open;

    if (reduceMotion) {
      el.style.transition = 'none';
      el.style.height = open ? 'auto' : '0px';
      return;
    }

    let cancelled = false;
    let endTimer = 0;

    const clearTransition = () => {
      if (cancelled) return;
      el.style.transition = '';
    };

    if (open) {
      el.style.overflow = 'hidden';
      el.style.height = '0px';
      el.style.transition = 'none';
      // 强制 reflow，再开启动画
      void el.offsetHeight;
      const target = el.scrollHeight;
      el.style.transition = `height ${COLLAPSE_MS}ms ${COLLAPSE_EASE}`;
      el.style.height = `${target}px`;
      endTimer = window.setTimeout(() => {
        if (cancelled || !openRef.current) return;
        el.style.height = 'auto';
        clearTransition();
      }, COLLAPSE_MS);
    } else {
      const current = el.scrollHeight;
      el.style.overflow = 'hidden';
      el.style.height = `${current}px`;
      el.style.transition = 'none';
      void el.offsetHeight;
      el.style.transition = `height ${COLLAPSE_MS}ms ${COLLAPSE_EASE}`;
      el.style.height = '0px';
      endTimer = window.setTimeout(clearTransition, COLLAPSE_MS);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(endTimer);
    };
  }, [open]);

  return ref;
}
