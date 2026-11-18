import { useLatest, useMemoizedFn, useUnmountedRef } from 'ahooks';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useChatSessionService } from '@/domains';
import {
  type ChatSession,
  type CreateSessionRequest,
  useChatSessionMetadata,
} from '@/domains/ChatSession';
import { useApi } from '@/hooks/useApi';
import { useChatSessionRoute } from '@/hooks/useChatSessionRoute';
import { useAppAuth } from '@/layouts/App/_context';
import { useChatSessionHistoryRefreshStore } from '@/layouts/AppLayout/_store/useChatSessionHistoryRefreshStore';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { ChatProps } from '../index.type';

interface UseChatSessionControllerOptions {
  resourceChat?: ChatProps['resourceChat'];
}

/**
 * 会话域：当前会话身份、会话列表浮层，以及新建与会话切换流程。
 *
 * 对外给出身份、isNewSession 意图与操作方法；对话内容、发送与审批属于 turn 域。
 */
export function useChatSessionController({ resourceChat }: UseChatSessionControllerOptions) {
  const { t } = useTranslation(['chat', 'common']);
  const appAuth = useAppAuth();
  const chatSessionService = useChatSessionService();
  const requestChatSessionHistoryRefresh = useChatSessionHistoryRefreshStore(
    (state) => state.requestRefresh
  );
  const { sessionId: currentSessionId, selectSession, locationKey } = useChatSessionRoute();
  const currentSession = useChatSessionMetadata(currentSessionId);
  const routeLatest = useLatest({ sessionId: currentSessionId, locationKey });
  const unmountedRef = useUnmountedRef();
  const creatingSessionRef = useRef<{
    locationKey: string;
    promise: Promise<ChatSession | undefined>;
  } | null>(null);
  const [newChatSessionId, setNewChatSessionId] = useState<string>();
  const pendingHistoryRefreshRef = useRef<string | undefined>(undefined);
  const [sessionBarOpen, setSessionBarOpen] = useState(false);
  const clearResourceChatContext = resourceChat?.clearContext;

  const { runAsync: runCreateSession } = useApi(
    (params?: CreateSessionRequest) => chatSessionService.createSession(params),
    { manual: true }
  );
  const { runAsync: runSetSessionAgent } = useApi(
    (params: { sessionId: string; agentId?: string | null }) =>
      chatSessionService.setSessionAgent(params),
    { manual: true }
  );

  const requireAuth = (): boolean => {
    if (appAuth.isAuthenticated) return true;
    appAuth.requireLogin();
    return false;
  };

  const panelTitle =
    currentSession?.title || t(currentSessionId ? 'session.untitled' : 'panel.newChat');

  /** 按需解析当前会话：未建立会话时先创建并同步 agent，再返回可发送的会话 ID。 */
  const ensureSession = useMemoizedFn(
    async (agentParams?: CreateSessionRequest): Promise<string | undefined> => {
      if (unmountedRef.current) return;
      if (!appAuth.isAuthenticated) {
        appAuth.requireLogin();
        throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
          reason: t('input.loginRequired'),
        });
      }
      let targetSessionId = currentSessionId;
      let targetSession = currentSession;
      if (!targetSessionId) {
        if (creatingSessionRef.current?.locationKey !== locationKey) {
          const promise = runCreateSession(agentParams).then(async (createdSession) => {
            if (unmountedRef.current || routeLatest.current.locationKey !== locationKey) return;
            setNewChatSessionId(createdSession.id);
            pendingHistoryRefreshRef.current = createdSession.id;
            await selectSession(createdSession.id, true);
            requestChatSessionHistoryRefresh();
            return createdSession;
          });
          creatingSessionRef.current = { locationKey, promise };
          const clearPending = () => {
            if (creatingSessionRef.current?.promise === promise) creatingSessionRef.current = null;
          };
          void promise.then(clearPending, clearPending);
        }
        const createdSession = await creatingSessionRef.current.promise;
        if (!createdSession) return;
        targetSessionId = createdSession.id;
        targetSession = createdSession;
      }
      if (unmountedRef.current || routeLatest.current.sessionId !== targetSessionId) return;
      const targetLocationKey = routeLatest.current.locationKey;
      if (agentParams) {
        const sessionAgentMatched =
          targetSession != null &&
          (agentParams.agentId == null
            ? targetSession.agentId == null
            : targetSession.agentId === agentParams.agentId);
        if (!sessionAgentMatched) {
          await runSetSessionAgent({
            sessionId: targetSessionId,
            agentId: agentParams.agentId,
          });
        }
      }
      if (unmountedRef.current || routeLatest.current.locationKey !== targetLocationKey) return;
      return targetSessionId;
    }
  );

  /**
   * 路由已离开「本页刚创建」会话时，在渲染期收敛标记。
   * 避免侧栏等绕过本 controller 切走后，再次进入同一 id 仍被当成新会话。
   */
  if (newChatSessionId != null && currentSessionId !== newChatSessionId) {
    setNewChatSessionId(undefined);
  }

  /**
   * 新建会话收到首个可渲染内容后通知侧栏刷新列表。
   * 由顶层在拿到 turn 域的可渲染状态后调用。
   */
  const syncNewSessionHistoryRefresh = useMemoizedFn((hasRenderableContent: boolean) => {
    if (currentSessionId == null || currentSessionId === '') return;
    if (pendingHistoryRefreshRef.current !== currentSessionId) return;
    if (!hasRenderableContent) return;
    requestChatSessionHistoryRefresh();
    pendingHistoryRefreshRef.current = undefined;
  });

  /** 当前路由会话是否为本页刚创建的空会话。 */
  const isNewSession = currentSessionId != null && currentSessionId === newChatSessionId;

  const toggleSessionBar = () => {
    if (!requireAuth()) return;
    setSessionBarOpen((open) => !open);
  };

  const closeSessionBar = () => {
    setSessionBarOpen(false);
  };

  const handleSelectSession = (session: ChatSession) => {
    if (!requireAuth()) return;
    if (session.id === currentSessionId) {
      setSessionBarOpen(false);
      return;
    }
    clearResourceChatContext?.();
    setNewChatSessionId(undefined);
    pendingHistoryRefreshRef.current = undefined;
    setSessionBarOpen(false);
    void selectSession(session.id);
  };

  const startNewChat = () => {
    if (!requireAuth()) return;
    clearResourceChatContext?.();
    setNewChatSessionId(undefined);
    pendingHistoryRefreshRef.current = undefined;
    setSessionBarOpen(false);
    void selectSession();
  };

  return {
    closeSessionBar,
    currentSessionId,
    ensureSession,
    isNewSession,
    panelTitle,
    promoteDraftToolSelection:
      currentSessionId !== undefined && currentSessionId === newChatSessionId,
    selectSession: handleSelectSession,
    sessionBarOpen,
    startNewChat,
    syncNewSessionHistoryRefresh,
    toggleSessionBar,
  };
}
