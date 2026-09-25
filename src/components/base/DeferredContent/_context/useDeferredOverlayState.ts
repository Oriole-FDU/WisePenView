import { useContext } from 'react';

import { DeferredOverlayContext, type DeferredOverlayState } from './DeferredOverlayContext';

export function useDeferredOverlayState(): DeferredOverlayState {
  const context = useContext(DeferredOverlayContext);
  return {
    delay: context?.delay ?? 0,
    isOpen: context?.isOpen ?? true,
    ready: context == null || !context.enabled ? true : context.ready,
  };
}

export function useDeferredOverlayContext() {
  return useContext(DeferredOverlayContext);
}
