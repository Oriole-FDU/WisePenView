import { type RefObject, useCallback, useEffect, useRef } from 'react';

import { DESKTOP_WINDOW_CONTROLS_WIDTH } from '@/constants/layoutScale';

interface UseResourceHeaderEndReserveOptions {
  /** 静止态对应的右 dock 宽度（展开=面板宽，收起=0） */
  idleDockWidthPx: number;
  /** Chat 宽度动画进行中时由 onDockWidthPixels 驱动，避免重复写静止值 */
  isAnimating: boolean;
}

interface ResourceHeaderEndReserve {
  headerRef: RefObject<HTMLElement | null>;
  /** 随 dock 实时宽度写入 CSS 变量；供 resize 动画帧 / onResize 调用 */
  onDockWidthPixels: (dockWidthPx: number) => void;
}

/**
 * Win 中间顶栏窗控留白：`reserve = max(0, 窗控宽 - dock宽)`。
 * 只写 CSS 变量、不 setState，保持连续留白且不拖垮 Chat 动画。
 */
export function useResourceHeaderEndReserve({
  idleDockWidthPx,
  isAnimating,
}: UseResourceHeaderEndReserveOptions): ResourceHeaderEndReserve {
  const headerRef = useRef<HTMLElement | null>(null);

  /**
   * @wisepen-manual-memo
   * 为什么：供 resize 动画帧与 useEffect 共享同一写 CSS 变量入口，需引用稳定。
   * 收益：避免动画中每帧因函数身份变化触发无关 effect。
   * 失效条件：写入依赖的窗控宽度常量变化，或改写 DOM 目标时。
   */
  const onDockWidthPixels = useCallback((dockWidthPx: number) => {
    const headerEl = headerRef.current;
    if (!headerEl) return;
    const reservePx = Math.max(0, Math.round(DESKTOP_WINDOW_CONTROLS_WIDTH - dockWidthPx));
    headerEl.style.setProperty('--resource-header-end-reserve', `${reservePx}px`);
  }, []);

  /**
   * @wisepen-manual-effect
   * 执行时机：动画结束后（或静止态宽度变化时）对齐一次留白。
   * 不可替代原因：CSS 变量写在 DOM 上，不属于 React 派生渲染。
   * cleanup：无。
   */
  useEffect(() => {
    if (isAnimating) return;
    onDockWidthPixels(idleDockWidthPx);
  }, [idleDockWidthPx, isAnimating, onDockWidthPixels]);

  return { headerRef, onDockWidthPixels };
}
