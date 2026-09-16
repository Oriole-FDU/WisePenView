import { toast } from '@heroui/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { appendRedirectParam } from '@/bootstrap/authContinuation';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

import { AppAuthContext, type AppAuthContextValue, type AppAuthMode } from './AppAuthContext';

interface AppAuthProviderProps {
  children: ReactNode;
  mode: AppAuthMode;
}

export function AppAuthProvider({ children, mode }: AppAuthProviderProps) {
  const { t } = useTranslation('shell');
  const isAuthenticated = mode === 'authenticated';
  const loginPath = appendRedirectParam(APP_ROUTE_PATH.AUTH_LOGIN, APP_ROUTE_PATH.CHAT);

  const value: AppAuthContextValue = {
    isAuthenticated,
    loginPath,
    requireLogin: () => {
      if (isAuthenticated) return;
      toast.warning(t('anonymous.loginRequired'));
    },
  };

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
}
