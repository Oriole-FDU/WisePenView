import { useRequiredContext } from '@/hooks/useRequiredContext';

import { AppAuthContext } from './AppAuthContext';

export function useAppAuth() {
  return useRequiredContext(AppAuthContext, 'AppAuthProvider');
}
