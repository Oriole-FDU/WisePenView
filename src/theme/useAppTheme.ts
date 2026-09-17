import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from './constants';

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'useAppTheme must be used within ThemeContextProvider',
    });
  }
  return ctx;
}
