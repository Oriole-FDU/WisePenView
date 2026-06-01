import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { COLOR_SCHEME, DEFAULT_COLOR_SCHEME, type ColorScheme } from './constants';

const COLOR_SCHEME_STORAGE_KEY = 'heroui-color-scheme';

const COLOR_SCHEME_VALUES = new Set<string>(Object.values(COLOR_SCHEME));

function isColorScheme(value: string): value is ColorScheme {
  return COLOR_SCHEME_VALUES.has(value);
}

function readStoredColorScheme(defaultScheme: ColorScheme): ColorScheme {
  if (typeof window === 'undefined') return defaultScheme;
  const stored = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY);
  return stored && isColorScheme(stored) ? stored : defaultScheme;
}

function applyColorSchemeToDOM(scheme: ColorScheme, previous: ColorScheme | undefined) {
  if (previous === scheme) return;
  document.documentElement.setAttribute('data-color-scheme', scheme);
}

/** localStorage 持久化，同时同步到 documentElement，只控制主题颜色*/
export function useColorScheme(defaultScheme: ColorScheme = DEFAULT_COLOR_SCHEME) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() =>
    readStoredColorScheme(defaultScheme)
  );

  const appliedRef = useRef<ColorScheme | undefined>(undefined);

  useLayoutEffect(() => {
    applyColorSchemeToDOM(colorScheme, appliedRef.current);
    appliedRef.current = colorScheme;
  }, [colorScheme]);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, scheme);
    setColorSchemeState(scheme);
  }, []);

  return { colorScheme, setColorScheme };
}
