import type { ReactNode } from 'react';

import {
  type DeferredContentProps,
  type DeferredOverlayState,
  type DeferredRenderable,
  useDeferredOverlayContext,
} from './_context';

function renderDeferredContent(
  content: DeferredRenderable | undefined,
  state: DeferredOverlayState
): ReactNode {
  if (typeof content === 'function') {
    return content(state);
  }
  return content ?? null;
}

export function DeferredContent({
  children,
  disabled = false,
  fallback = null,
}: DeferredContentProps) {
  const context = useDeferredOverlayContext();
  const state: DeferredOverlayState = {
    delay: context?.delay ?? 0,
    isOpen: context?.isOpen ?? true,
    ready: disabled || context == null || !context.enabled ? true : context.ready,
  };

  return <>{renderDeferredContent(state.ready ? children : fallback, state)}</>;
}
