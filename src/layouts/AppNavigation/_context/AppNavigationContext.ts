import { createContext } from 'react';

export interface AppNavigationContextValue {
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
  openCommandPalette: () => void;
}

export const AppNavigationContext = createContext<AppNavigationContextValue | null>(null);
