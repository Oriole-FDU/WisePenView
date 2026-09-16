import { createContext, useContext } from 'react';

import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

export type AppAuthMode = 'authenticated' | 'anonymous';

export interface AppAuthContextValue {
  isAuthenticated: boolean;
  loginPath: string;
  requireLogin: () => void;
}

export const AppAuthContext = createContext<AppAuthContextValue>({
  isAuthenticated: true,
  loginPath: APP_ROUTE_PATH.AUTH_LOGIN,
  requireLogin: () => undefined,
});

export const useAppAuth = (): AppAuthContextValue => useContext(AppAuthContext);
