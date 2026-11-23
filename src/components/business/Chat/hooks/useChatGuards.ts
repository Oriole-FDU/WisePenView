import { useLatest, useUnmountedRef } from 'ahooks';

import { useChatSessionRoute } from '@/hooks/useChatSessionRoute';
import { useAppAuth } from '@/layouts/App/_context';

/** 登录校验与路由存活门闩，供 Chat 各入口共用。 */
export function useChatGuards() {
  const { isAuthenticated, requireLogin } = useAppAuth();
  const { locationKey } = useChatSessionRoute();
  const locationKeyLatest = useLatest(locationKey);
  const unmountedRef = useUnmountedRef();

  const requireAuth = (): boolean => {
    if (isAuthenticated) return true;
    requireLogin();
    return false;
  };

  /** 组件未卸载且仍停留在 startedLocationKey 对应路由。 */
  const isRouteLive = (startedLocationKey: string) =>
    !unmountedRef.current && locationKeyLatest.current === startedLocationKey;

  return { locationKey, locationKeyLatest, requireAuth, isRouteLive };
}
