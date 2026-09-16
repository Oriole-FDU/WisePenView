import { useSyncExternalStore } from 'react';

import { STORAGE_KEYS } from '@/constants/storageKeys';

const READING_MODE_ACCENT_SURFACE_NEUTRAL_MIX_PERCENT = 40;
const READING_MODE_ACCENT_FOREGROUND_NEUTRAL_MIX_PERCENT = 10;
const readingModeListeners = new Set<() => void>();

function readStoredReadingMode(defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue;
  return localStorage.getItem(STORAGE_KEYS.readingMode) === 'true';
}

let sharedReadingMode = readStoredReadingMode(false);

export function applyReadingModeToDOM(isReadingMode: boolean) {
  document.documentElement.setAttribute('data-reading-mode', String(isReadingMode));
  document.documentElement.style.setProperty(
    '--palette-accent-surface-neutral-mix',
    isReadingMode ? `${READING_MODE_ACCENT_SURFACE_NEUTRAL_MIX_PERCENT}%` : '0%'
  );
  document.documentElement.style.setProperty(
    '--palette-accent-foreground-neutral-mix',
    isReadingMode ? `${READING_MODE_ACCENT_FOREGROUND_NEUTRAL_MIX_PERCENT}%` : '0%'
  );
}

function emitReadingModeChange() {
  for (const listener of readingModeListeners) {
    listener();
  }
}

function subscribeReadingMode(listener: () => void): () => void {
  readingModeListeners.add(listener);
  return () => readingModeListeners.delete(listener);
}

function setSharedReadingMode(isReadingMode: boolean) {
  if (sharedReadingMode === isReadingMode) return;
  sharedReadingMode = isReadingMode;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.readingMode, String(isReadingMode));
  }
  emitReadingModeChange();
}

/** 阅读模式：浅阶（含 AI Diff 底）混入 40% neutral，深阶（边框等）混入 10% neutral。 */
export function useAccentNeutralized(defaultValue = false) {
  const isAccentNeutralized = useSyncExternalStore(
    subscribeReadingMode,
    () => sharedReadingMode,
    () => readStoredReadingMode(defaultValue)
  );

  return {
    isAccentNeutralized,
    setAccentNeutralized: setSharedReadingMode,
  };
}
