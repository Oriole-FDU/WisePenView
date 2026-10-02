import { type RefObject, useLayoutEffect, useRef } from 'react';

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
  // 调用方通常在渲染时创建测量函数；用 ref 保持 effect 的订阅生命周期稳定。
  const measureRef = useRef(measure);
  const onInactiveRef = useRef(onInactive);

  /**
   * @wisepen-manual-effect
   * 执行时机：每次提交后保存调用方最新的定位与关闭回调。
   * 不可替代原因：订阅 effect 不能依赖每次渲染新建的回调，否则会反复注册监听并触发定位更新循环。
   * cleanup：仅同步 ref，没有需要释放的外部资源。
   */
  useLayoutEffect(() => {
    measureRef.current = measure;
    onInactiveRef.current = onInactive;
  });

  /**
   * @wisepen-manual-effect
   * 执行时机：进入或退出公式编辑态时，注册或清理锚点尺寸与页面滚动监听。
   * 不可替代原因：锚点位置、窗口尺寸与滚动位置属于浏览器 DOM 状态，必须命令式同步。
   * cleanup：退出编辑态或卸载时取消动画帧、断开 ResizeObserver 并移除事件监听。
   */
  useLayoutEffect(() => {
    if (!isEditing) {
      onInactiveRef.current();
      return;
    }

    let rafId = 0;
    let cancelled = false;
    const sync = () => {
      if (cancelled) return;
      measureRef.current();
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
      if (measureRef.current()) {
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
  }, [isEditing, shellRef]);
}
