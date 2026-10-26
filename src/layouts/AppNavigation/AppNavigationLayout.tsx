import { useKeyPress } from 'ahooks';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import { createGuideActions, GuideHost } from '@/components/base/Guide';
import CommandPalette from '@/components/business/CommandPalette';
import { GUIDE_SHELL_TOUR_ID } from '@/constants/tour';
import { useAppAuth } from '@/layouts/App/_context';
import { workspaceRightPanelActions } from '@/layouts/WorkspaceRightPanelLayout';

import { type AppNavigationContextValue, AppNavigationProvider } from './_context';

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
  /**
   * @wisepen-manual-memo
   * 为什么：动作适配器内部保存待关闭菜单，布局每次渲染都重建会丢掉上一步的清理状态。
   * 收益：整个登录会话复用同一份 Guide 动作实例。
   * 失效条件：注入的 openChat 来源变化时需要重新创建。
   */
  const appGuideActions = useMemo(
    () => createGuideActions({ openChat: () => workspaceRightPanelActions.openPanel('chat') }),
    []
  );

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
    <AppNavigationProvider value={value}>
      <Outlet />
      {appAuth.isAuthenticated ? (
        <>
          <GuideHost shellTourId={GUIDE_SHELL_TOUR_ID} actions={appGuideActions} />
          <CommandPalette isOpen={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
        </>
      ) : null}
    </AppNavigationProvider>
  );
}

export default AppNavigationLayout;
