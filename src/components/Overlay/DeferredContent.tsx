import { useContext, useEffect, useState, type ReactNode } from 'react';
import {
  DeferredOverlayContext,
  type DeferredContentProps,
  type DeferredOverlayContextValue,
  type DeferredOverlayProviderProps,
  type DeferredOverlayState,
  type DeferredRenderable,
} from './DeferredContentContext';

export type {
  DeferredContentProps,
  DeferredOverlayProviderProps,
  DeferredOverlayState,
} from './DeferredContentContext';

function renderDeferredContent(
  content: DeferredRenderable | undefined,
  state: DeferredOverlayState
): ReactNode {
  if (typeof content === 'function') {
    return content(state);
  }
  return content ?? null;
}

function useDeferredReady(delay: number): boolean {
  const [ready, setReady] = useState(false);

  /**
   * @wisepen-manual-effect
   * 执行时机：已打开的浮层挂载或延迟时长变化时，安排内容挂载。
   * 不可替代原因：计时器和动画帧是浏览器外部资源，需要跟随已打开浮层的生命周期同步。
   * cleanup：取消未执行的计时器与动画帧，避免过期浮层写入状态。
   */
  useEffect(() => {
    let frame: number | null = null;
    const timer = window.setTimeout(
      () => {
        frame = window.requestAnimationFrame(() => {
          frame = null;
          setReady(true);
        });
      },
      Math.max(0, delay)
    );

    return () => {
      window.clearTimeout(timer);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [delay]);

  return ready;
}

function OpenDeferredOverlayProvider({
  children,
  delay,
}: Pick<DeferredOverlayProviderProps, 'children' | 'delay'>) {
  const ready = useDeferredReady(delay);
  const value = {
    delay,
    enabled: true,
    isOpen: true,
    ready,
  } satisfies DeferredOverlayContextValue;

  return (
    <DeferredOverlayContext.Provider value={value}>{children}</DeferredOverlayContext.Provider>
  );
}

export function DeferredOverlayProvider({
  children,
  delay,
  enabled = true,
  isOpen,
}: DeferredOverlayProviderProps) {
  if (enabled && isOpen) {
    return <OpenDeferredOverlayProvider delay={delay}>{children}</OpenDeferredOverlayProvider>;
  }

  const value = {
    delay,
    enabled,
    isOpen,
    ready: !enabled,
  } satisfies DeferredOverlayContextValue;

  return (
    <DeferredOverlayContext.Provider value={value}>{children}</DeferredOverlayContext.Provider>
  );
}

export function DeferredContent({
  children,
  disabled = false,
  fallback = null,
}: DeferredContentProps) {
  const context = useContext(DeferredOverlayContext);
  const state: DeferredOverlayState = {
    delay: context?.delay ?? 0,
    isOpen: context?.isOpen ?? true,
    ready: disabled || context == null || !context.enabled ? true : context.ready,
  };

  return <>{renderDeferredContent(state.ready ? children : fallback, state)}</>;
}
