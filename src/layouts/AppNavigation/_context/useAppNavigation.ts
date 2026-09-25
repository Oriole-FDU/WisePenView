import { useRequiredContext } from '@/hooks/useRequiredContext';

import { AppNavigationContext } from './AppNavigationContext';

export function useAppNavigation() {
  return useRequiredContext(AppNavigationContext, 'AppNavigationLayout');
}
