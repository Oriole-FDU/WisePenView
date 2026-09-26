import { createContext } from 'react';

export type AppAuthMode = 'authenticated' | 'anonymous';

export interface AppAuthContextValue {
  isAuthenticated: boolean;
  loginPath: string;
  requireLogin: () => void;
}

export const AppAuthContext = createContext<AppAuthContextValue | null>(null);
