import { useMemoizedFn } from 'ahooks';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';

import { buildChatSessionLocation, getChatSessionId } from '@/utils/navigation/chatRoute';
import { isRecord } from '@/utils/type/typeGuards';

export function useChatSessionRoute() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();
  const sessionId = getChatSessionId(location);
  const state: unknown = location.state;
  // 返回或前进到该历史条目时，按普通会话切换处理。
  const draftLocationKey =
    sessionId &&
    navigationType === 'REPLACE' &&
    isRecord(state) &&
    typeof state.chatDraftLocationKey === 'string'
      ? state.chatDraftLocationKey
      : undefined;

  const selectSession = useMemoizedFn(
    (sessionId?: string, mode: 'push' | 'replace' | 'promote-draft' = 'push') =>
      navigate(buildChatSessionLocation(location, sessionId), {
        replace: mode !== 'push',
        flushSync: true,
        state: mode === 'promote-draft' ? { chatDraftLocationKey: location.key } : undefined,
      })
  );

  return {
    sessionId,
    selectSession,
    locationKey: location.key,
    composerKey: draftLocationKey ?? location.key,
    isDraftPromotion: draftLocationKey !== undefined,
  };
}
