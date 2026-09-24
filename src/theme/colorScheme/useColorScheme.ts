import { useSyncExternalStore } from 'react';

import { STORAGE_KEYS } from '@/constants/storageKeys';

import { COLOR_SCHEME, type ColorScheme, DEFAULT_COLOR_SCHEME } from './constants';

const COLOR_SCHEME_VALUES = new Set<string>(Object.values(COLOR_SCHEME));
const LEGACY_MIST_COLOR_SCHEME = 'default';
const colorSchemeListeners = new Set<() => void>();

let sharedColorScheme: ColorScheme = readStoredColorScheme(DEFAULT_COLOR_SCHEME);

function isColorScheme(value: string): value is ColorScheme {
  return COLOR_SCHEME_VALUES.has(value);
}

function readStoredColorScheme(defaultScheme: ColorScheme): ColorScheme {
  if (typeof window === 'undefined') return defaultScheme;
  const stored = localStorage.getItem(STORAGE_KEYS.colorScheme);
  if (stored === LEGACY_MIST_COLOR_SCHEME) return COLOR_SCHEME.MIST;
  return stored && isColorScheme(stored) ? stored : defaultScheme;
}

function emitColorSchemeChange() {
  for (const listener of colorSchemeListeners) {
    listener();
  }
}

function subscribeColorScheme(listener: () => void): () => void {
  colorSchemeListeners.add(listener);
  return () => colorSchemeListeners.delete(listener);
}

function setSharedColorScheme(scheme: ColorScheme) {
  if (sharedColorScheme === scheme) return;
  sharedColorScheme = scheme;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.colorScheme, scheme);
  }
  emitColorSchemeChange();
}

/** 主题色共享状态：从 localStorage 读取，切换时同步所有订阅者 */
export function useColorScheme(defaultScheme: ColorScheme = DEFAULT_COLOR_SCHEME) {
  const colorScheme = useSyncExternalStore(
    subscribeColorScheme,
    () => sharedColorScheme,
    () => readStoredColorScheme(defaultScheme)
  );

  const setColorScheme = (scheme: ColorScheme) => {
    if (typeof window === 'undefined') return;
    setSharedColorScheme(scheme);
  };

  return { colorScheme, setColorScheme };
}
