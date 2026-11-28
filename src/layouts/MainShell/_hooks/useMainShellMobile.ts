import { useSyncExternalStore } from 'react';

import { MAIN_SHELL_DRAWER_MAX_WIDTH } from '@/constants/layoutScale';

const MAIN_SHELL_DRAWER_QUERY = `(max-width: ${MAIN_SHELL_DRAWER_MAX_WIDTH - 0.02}px)`;

interface MainShellMobileSnapshot {
  breakpointVersion: number;
  isMobileLayout: boolean;
}

const SERVER_SNAPSHOT: MainShellMobileSnapshot = {
  breakpointVersion: 0,
  isMobileLayout: false,
};

let currentSnapshot: MainShellMobileSnapshot = SERVER_SNAPSHOT;

const getMainShellMobileMatches = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia(MAIN_SHELL_DRAWER_QUERY).matches;

const syncMainShellMobileSnapshot = (): void => {
  const isMobileLayout = getMainShellMobileMatches();
  if (currentSnapshot.isMobileLayout === isMobileLayout) return;
  currentSnapshot = {
    breakpointVersion: currentSnapshot.breakpointVersion + 1,
    isMobileLayout,
  };
};

const subscribeMainShellMobile = (listener: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;
  const query = window.matchMedia(MAIN_SHELL_DRAWER_QUERY);
  const handleChange = () => {
    syncMainShellMobileSnapshot();
    listener();
  };

  query.addEventListener('change', handleChange);
  return () => query.removeEventListener('change', handleChange);
};

const getMainShellMobileSnapshot = (): MainShellMobileSnapshot => {
  syncMainShellMobileSnapshot();
  return currentSnapshot;
};

const getServerMainShellMobileSnapshot = (): MainShellMobileSnapshot => SERVER_SNAPSHOT;

/** 与应用壳侧栏 Drawer 断点保持一致。 */
export function useMainShellMobileSnapshot(): MainShellMobileSnapshot {
  return useSyncExternalStore(
    subscribeMainShellMobile,
    getMainShellMobileSnapshot,
    getServerMainShellMobileSnapshot
  );
}
