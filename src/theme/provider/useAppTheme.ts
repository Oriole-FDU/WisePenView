import { useContext } from 'react';

import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import { ThemeContext, type ThemeContextValue } from './ThemeContextValue';

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'useAppTheme must be used within ThemeContextProvider',
    });
  }
  return ctx;
}
