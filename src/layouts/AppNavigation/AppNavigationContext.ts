import { createContext, useContext } from 'react';

import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

export interface AppNavigationContextValue {
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
  openCommandPalette: () => void;
}

export const AppNavigationContext = createContext<AppNavigationContextValue | null>(null);

export const useAppNavigation = (): AppNavigationContextValue => {
  const context = useContext(AppNavigationContext);
  if (!context) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'useAppNavigation 必须在 AppNavigationLayout 内使用',
    });
  }
  return context;
};
