import { createContext, type ReactNode } from 'react';

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
