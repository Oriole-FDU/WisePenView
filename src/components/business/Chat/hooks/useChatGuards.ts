import { useLatest, useUnmountedRef } from 'ahooks';

import { useChatSessionRoute } from '@/hooks/useChatSessionRoute';
import { useAppAuth } from '@/layouts/App/_context';

/** 登录校验与路由存活门闩，供 Chat 各入口共用。 */
export function useChatGuards() {
  const { isAuthenticated, requireLogin } = useAppAuth();
  const route = useChatSessionRoute();
  const routeLatest = useLatest(route);
  const unmountedRef = useUnmountedRef();

  const requireAuth = (): boolean => {
    if (isAuthenticated) return true;
    requireLogin();
    return false;
  };

  /** 组件未卸载且仍停留在 startedLocationKey 对应路由。 */
  const isRouteLive = (startedLocationKey: string) =>
    !unmountedRef.current && routeLatest.current.locationKey === startedLocationKey;

  const isComposerLive = (composerKey: string, sessionId?: string) => {
    const current = routeLatest.current;
    return (
      !unmountedRef.current &&
      current.composerKey === composerKey &&
      (sessionId === undefined || current.sessionId === sessionId)
    );
  };

  return { ...route, requireAuth, isRouteLive, isComposerLive };
}
