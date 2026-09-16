import {
  LAYOUT_DENSITY,
  LAYOUT_HEIGHT_DENSITY,
  type LayoutDensity,
  type LayoutHeightDensity,
} from '@/constants/layoutScale';
import { syncViewportLayoutScale } from '@/layouts/_common/applyLayoutScaleCssVars';
import { useSyncExternalStore } from 'react';

interface ViewportLayoutScale {
  widthDensity: LayoutDensity;
  heightDensity: LayoutHeightDensity;
}

const DEFAULT_SCALE: ViewportLayoutScale = {
  widthDensity: LAYOUT_DENSITY.NORMAL,
  heightDensity: LAYOUT_HEIGHT_DENSITY.NORMAL,
};

let currentScale: ViewportLayoutScale =
  typeof window === 'undefined' ? DEFAULT_SCALE : syncViewportLayoutScale();
let resizeListening = false;
const listeners = new Set<() => void>();

const emit = (): void => {
  for (const listener of listeners) listener();
};

const syncFromViewport = (): void => {
  const next = syncViewportLayoutScale();
  if (
    next.widthDensity === currentScale.widthDensity &&
    next.heightDensity === currentScale.heightDensity
  ) {
    return;
  }
  currentScale = next;
  emit();
};

const ensureResizeListening = (): void => {
  if (resizeListening || typeof window === 'undefined') return;
  window.addEventListener('resize', syncFromViewport);
  resizeListening = true;
};

const stopResizeListeningIfIdle = (): void => {
  if (!resizeListening || listeners.size > 0 || typeof window === 'undefined') return;
  window.removeEventListener('resize', syncFromViewport);
  resizeListening = false;
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  ensureResizeListening();
  syncFromViewport();
  return () => {
    listeners.delete(listener);
    stopResizeListeningIfIdle();
  };
};

const getSnapshot = (): ViewportLayoutScale => currentScale;
const getServerSnapshot = (): ViewportLayoutScale => DEFAULT_SCALE;

/**
 * 将视口宽高密度同步到 documentElement（data-layout-* + CSS 变量）。
 * 多处调用共享同一订阅，与侧栏 compact 同源。
 */
export const useViewportLayoutScale = (): ViewportLayoutScale =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
