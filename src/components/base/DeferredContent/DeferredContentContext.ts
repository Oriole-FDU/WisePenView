import { createContext, type ReactNode, use } from 'react';

export interface DeferredOverlayState {
  isOpen: boolean;
  ready: boolean;
  delay: number;
}

export type DeferredRenderable = ReactNode | ((state: DeferredOverlayState) => ReactNode);

export interface DeferredOverlayContextValue extends DeferredOverlayState {
  enabled: boolean;
}

export interface DeferredOverlayProviderProps {
  children: ReactNode;
  delay: number;
  enabled?: boolean;
  isOpen: boolean;
}

export interface DeferredContentProps {
  children: DeferredRenderable;
  disabled?: boolean;
  fallback?: DeferredRenderable;
}

export const DeferredOverlayContext = createContext<DeferredOverlayContextValue | null>(null);

export function useDeferredOverlayState(): DeferredOverlayState {
  const context = use(DeferredOverlayContext);
  return {
    delay: context?.delay ?? 0,
    isOpen: context?.isOpen ?? true,
    ready: context == null || !context.enabled ? true : context.ready,
  };
}
