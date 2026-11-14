import { useLatest, useMemoizedFn, useUnmountedRef } from 'ahooks';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useChatSessionService } from '@/domains';
import type { ChatAgentOption } from '@/domains/ChatConfig';
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
 * 只输出会话身份和意图方法；对话内容、发送与审批属于 turn 域。
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
    draftVersion?: number;
    draftAgentId?: string;
    promise: Promise<ChatSession | undefined>;
  } | null>(null);
  const [newChatSessionId, setNewChatSessionId] = useState<string>();
  const newSessionIdLatest = useLatest(newChatSessionId);
  const pendingHistoryRefreshRef = useRef<string | undefined>(undefined);
  const [sessionBarOpen, setSessionBarOpen] = useState(false);
  const clearResourceChatContext = resourceChat?.clearContext;

  const { runAsync: runCreateSession } = useApi(
    (params?: CreateSessionRequest) => chatSessionService.createSession(params),
    { manual: true, showErrorToast: false }
  );
  const { runAsync: runSetSessionAgent } = useApi(
    (params: { sessionId: string; agentId?: string | null }) =>
      chatSessionService.setSessionAgent(params),
    { manual: true, showErrorToast: false }
  );

  const requireAuth = (): boolean => {
    if (appAuth.isAuthenticated) return true;
    appAuth.requireLogin();
    return false;
  };

  const panelTitle =
    currentSession?.title || t(currentSessionId ? 'session.untitled' : 'panel.newChat');

  /** 上传和发送按同一个 Agent 选项选择会话。 */
  const ensureSession = useMemoizedFn(
    async (
      selectedAgent?: ChatAgentOption,
      { hasAttachments = false } = {}
    ): Promise<string | undefined> => {
      if (unmountedRef.current) return;
      if (!appAuth.isAuthenticated) {
        appAuth.requireLogin();
        throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
          reason: t('input.loginRequired'),
        });
      }
      let agentParams: CreateSessionRequest | undefined;
      if (selectedAgent?.source === 'CURRENT_DRAFT') {
        const { resourceId: agentId, agentVersion: draftVersion } = selectedAgent;
        if (!agentId || draftVersion === undefined) {
          throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_DRAFT_DEBUG_UNAVAILABLE);
        }
        agentParams = { agentId, draftVersion };
      } else if (selectedAgent?.resourceId) {
        agentParams = { agentId: selectedAgent.resourceId };
      } else if (selectedAgent?.isDefault || selectedAgent?.source === 'DEFAULT') {
        agentParams = { agentId: null };
      }

      let targetSessionId = currentSessionId;
      let targetSession =
        currentSession ??
        (targetSessionId && agentParams
          ? await chatSessionService.getSession(targetSessionId)
          : undefined);
      if (unmountedRef.current || routeLatest.current.locationKey !== locationKey) return;

      const draftVersion = agentParams?.draftVersion;
      const draftAgentId = draftVersion !== undefined ? agentParams?.agentId : undefined;
      const matchesDraft = (session: ChatSession) =>
        session.isDraftDebug &&
        session.agentId === draftAgentId &&
        session.agentVersion === draftVersion;
      const needsSeparateSession =
        agentParams &&
        (draftVersion !== undefined
          ? !targetSession || !matchesDraft(targetSession)
          : targetSession?.isDraftDebug);
      if (needsSeparateSession && hasAttachments) {
        throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_ATTACHMENTS_SESSION_MISMATCH);
      }
      if (!targetSessionId || needsSeparateSession) {
        const pending = creatingSessionRef.current;
        if (
          pending?.locationKey === locationKey &&
          (pending.draftVersion !== draftVersion || pending.draftAgentId !== draftAgentId)
        )
          return;
        if (pending?.locationKey !== locationKey) {
          const promise = runCreateSession(agentParams).then(async (createdSession) => {
            if (unmountedRef.current || routeLatest.current.locationKey !== locationKey) return;
            if (draftVersion !== undefined && !matchesDraft(createdSession)) {
              throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_DRAFT_DEBUG_UNAVAILABLE);
            }
            setNewChatSessionId(createdSession.id);
            pendingHistoryRefreshRef.current = createdSession.isDraftDebug
              ? undefined
              : createdSession.id;
            await selectSession(createdSession.id, true);
            if (!createdSession.isDraftDebug) requestChatSessionHistoryRefresh();
            return createdSession;
          });
          creatingSessionRef.current = { locationKey, draftAgentId, draftVersion, promise };
          const clearPending = () => {
            if (creatingSessionRef.current?.promise === promise) creatingSessionRef.current = null;
          };
          void promise.then(clearPending, clearPending);
        }
        const createdSession = await creatingSessionRef.current?.promise;
        if (!createdSession) return;
        targetSessionId = createdSession.id;
        targetSession = createdSession;
      }
      if (unmountedRef.current || routeLatest.current.sessionId !== targetSessionId) return;
      const targetLocationKey = routeLatest.current.locationKey;
      if (agentParams && draftVersion === undefined) {
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

  const isNewlyCreatedSession = useMemoizedFn(
    (sessionId: string) => newSessionIdLatest.current === sessionId
  );

  /**
   * 释放新建会话标记：同时清掉待刷新标记，避免会话切换后残留到下一次进入。
   * 由 turn 域在会话切换清理时调用。
   */
  const clearNewlyCreatedSession = useMemoizedFn((sessionId: string) => {
    setNewChatSessionId((id) => (id === sessionId ? undefined : id));
    if (pendingHistoryRefreshRef.current === sessionId) {
      pendingHistoryRefreshRef.current = undefined;
    }
  });

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
    clearNewlyCreatedSession,
    closeSessionBar,
    currentSessionId,
    ensureSession,
    isNewlyCreatedSession,
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
