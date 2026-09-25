import { useRequiredContext } from '@/hooks/useRequiredContext';

import { MainShellContext } from './MainShellContext';

export function useMainShell() {
  return useRequiredContext(MainShellContext, 'MainShell');
}
