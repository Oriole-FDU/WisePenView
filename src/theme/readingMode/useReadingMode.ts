import { useSyncExternalStore } from 'react';

import { STORAGE_KEYS } from '@/constants/storageKeys';

const readingModeListeners = new Set<() => void>();

function readStoredReadingMode(defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue;
  return localStorage.getItem(STORAGE_KEYS.readingMode) === 'true';
}

let sharedReadingMode = readStoredReadingMode(false);

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

/** 阅读模式共享状态：保存用户选择并同步所有订阅者。 */
export function useReadingMode(defaultValue = false) {
  const isReadingMode = useSyncExternalStore(
    subscribeReadingMode,
    () => sharedReadingMode,
    () => readStoredReadingMode(defaultValue)
  );

  return {
    isReadingMode,
    setReadingMode: setSharedReadingMode,
  };
}
