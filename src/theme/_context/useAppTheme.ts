import { useRequiredContext } from '@/hooks/useRequiredContext';

import { ThemeContext, type ThemeContextValue } from './ThemeContext';

export function useAppTheme(): ThemeContextValue {
  return useRequiredContext(ThemeContext, 'ThemeProvider');
}
