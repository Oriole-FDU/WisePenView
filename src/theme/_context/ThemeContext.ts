import { createContext } from 'react';

import type { ResolvedTheme, ThemeMode } from '../mode/constants';

export type { ResolvedTheme, ThemeMode } from '../mode/constants';

export interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
