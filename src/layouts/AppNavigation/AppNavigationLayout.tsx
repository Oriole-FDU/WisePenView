import { useKeyPress } from 'ahooks';
import { useState, useSyncExternalStore } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import CommandPalette from '@/components/business/CommandPalette';
import { useAppAuth } from '@/layouts/App/AppAuthContext';

import { AppNavigationContext, type AppNavigationContextValue } from './AppNavigationContext';

const HISTORY_BACK = 1;
const HISTORY_FORWARD = 2;

const subscribeHistory = (listener: () => void): (() => void) =>
  window.desktop?.onNavigationStateChange(listener) ?? (() => undefined);

const getHistorySnapshot = (): number => {
  const state = window.desktop?.getNavigationState();
  return (state?.canGoBack ? HISTORY_BACK : 0) | (state?.canGoForward ? HISTORY_FORWARD : 0);
};

function AppNavigationLayout() {
  const navigate = useNavigate();
  const appAuth = useAppAuth();
  const historySnapshot = useSyncExternalStore(subscribeHistory, getHistorySnapshot, () => 0);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useKeyPress(
    ['ctrl.k', 'meta.k'],
    (event) => {
      event.preventDefault();
      if (!appAuth.isAuthenticated) {
        appAuth.requireLogin();
        return;
      }
      setCommandPaletteOpen((open) => !open);
    },
    { exactMatch: true }
  );

  const canGoBack = (historySnapshot & HISTORY_BACK) !== 0;
  const canGoForward = (historySnapshot & HISTORY_FORWARD) !== 0;
  const value: AppNavigationContextValue = {
    canGoBack,
    canGoForward,
    goBack: () => {
      if (window.desktop) {
        void window.desktop.navigationBack();
        return;
      }
      void navigate(-1);
    },
    goForward: () => {
      if (window.desktop) {
        void window.desktop.navigationForward();
        return;
      }
      void navigate(1);
    },
    openCommandPalette: () => {
      if (!appAuth.isAuthenticated) {
        appAuth.requireLogin();
        return;
      }
      setCommandPaletteOpen(true);
    },
  };

  return (
    <AppNavigationContext.Provider value={value}>
      <Outlet />
      {appAuth.isAuthenticated ? (
        <CommandPalette isOpen={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      ) : null}
    </AppNavigationContext.Provider>
  );
}

export default AppNavigationLayout;
