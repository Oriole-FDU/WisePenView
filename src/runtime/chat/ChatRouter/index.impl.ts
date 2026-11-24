import { getChatSessionService } from '@/domains';
import type { IChatSessionService } from '@/domains/ChatSession';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { ChatRouterSendRequest, SessionApprovalDecision } from '../_common';
import { createSessionCoordinator } from '../SessionCoordinator/index.impl';
import type { SessionRuntime } from '../SessionRuntime/index.type';
import type { ChatRouter, ChatRouterSnapshot } from './index.type';

export function createChatRouter(): ChatRouter {
  const coordinator = createSessionCoordinator();
  const chatSessionService: IChatSessionService = getChatSessionService();
  const listeners = new Set<() => void>();
  let foreground: SessionRuntime | null = null;
  let unsubscribeForeground: (() => void) | null = null;
  let routeIntent: { sessionId?: string } = {};
  let cleaned = false;
  let snapshot: ChatRouterSnapshot = {
    sessionId: null,
    chat: null,
    runtime: null,
  };

  function assertAlive(): void {
    if (!cleaned) return;
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'ChatRouter 已 cleanup',
    });
  }

  function buildSnapshot(): ChatRouterSnapshot {
    if (!foreground) return { sessionId: null, chat: null, runtime: null };
    const runtime = foreground.getSnapshot();
    return {
      sessionId: runtime.sessionId,
      chat: foreground.chat,
      runtime,
    };
  }

  function emit(): void {
    snapshot = buildSnapshot();
    for (const listener of listeners) listener();
  }

  function clearForeground(): void {
    unsubscribeForeground?.();
    unsubscribeForeground = null;
    foreground = null;
    emit();
  }

  function setForeground(runtime: SessionRuntime): void {
    if (foreground === runtime) {
      runtime.setVisibility('foreground');
      return;
    }

    unsubscribeForeground?.();
    foreground?.setVisibility('background');
    foreground = runtime;
    runtime.setVisibility('foreground');
    unsubscribeForeground = runtime.subscribe(emit);
    emit();
  }

  function getForeground(sessionId: string): SessionRuntime | undefined {
    if (foreground?.getSnapshot().sessionId === sessionId) return foreground;
  }

  function requireForeground(sessionId: string): SessionRuntime {
    assertAlive();
    const runtime = getForeground(sessionId);
    if (!runtime) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: '会话已离开前台',
      });
    }
    return runtime;
  }

  function getSnapshot(): ChatRouterSnapshot {
    return snapshot;
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  async function focusSession(sessionId: string): Promise<void> {
    assertAlive();
    const intent = { sessionId };
    routeIntent = intent;
    if (getForeground(sessionId)) return;
    const retainSessionId = foreground?.getSnapshot().sessionId;
    const runtime = await coordinator.acquire(sessionId, { retainSessionId });
    if (cleaned || intent !== routeIntent) return;
    setForeground(runtime);
  }

  async function createSession(): Promise<string | undefined> {
    assertAlive();
    const intent = routeIntent;
    const retainSessionId = foreground?.getSnapshot().sessionId;
    const runtime = await coordinator.createSession(undefined, { retainSessionId });
    if (cleaned || intent !== routeIntent) return;
    const sessionId = runtime.getSnapshot().sessionId;
    routeIntent = { sessionId };
    setForeground(runtime);
    return sessionId;
  }

  function leaveSession(route?: { sessionId: string | undefined }): void {
    if (route && routeIntent.sessionId !== route.sessionId) return;
    routeIntent = {};
    if (!foreground) return;
    const previous = foreground;
    clearForeground();
    previous.setVisibility('background');
  }

  async function notifySessionDeleted(sessionId: string): Promise<void> {
    if (routeIntent.sessionId === sessionId) routeIntent = {};
    if (getForeground(sessionId)) clearForeground();
    await coordinator.dispose(sessionId);
  }

  async function send(query: string, request: ChatRouterSendRequest): Promise<void> {
    assertAlive();
    const { sessionId, create, onSessionCreated, ...sendOptions } = request;
    const intent = routeIntent;
    const retainSessionId = foreground?.getSnapshot().sessionId;
    const targetRuntime = sessionId
      ? (getForeground(sessionId) ?? (await coordinator.acquire(sessionId, { retainSessionId })))
      : await coordinator.createSession(create, { retainSessionId });
    assertAlive();

    if (!sessionId && intent === routeIntent) {
      const createdSessionId = targetRuntime.getSnapshot().sessionId;
      routeIntent = { sessionId: createdSessionId };
      setForeground(targetRuntime);
      await onSessionCreated?.(createdSessionId);
    } else if (sessionId && create && 'agentId' in create) {
      await chatSessionService.setSessionAgent({
        sessionId,
        agentId: create.agentId,
      });
    }

    await targetRuntime.send(query, sendOptions);
  }

  async function cancel(sessionId: string): Promise<void> {
    await requireForeground(sessionId).cancel();
  }

  async function approve(sessionId: string, decisions: SessionApprovalDecision[]): Promise<void> {
    await requireForeground(sessionId).approve(decisions);
  }

  async function loadMoreHistory(sessionId: string): Promise<void> {
    await requireForeground(sessionId).loadMoreHistory();
  }

  async function cleanup(): Promise<void> {
    if (cleaned) return;
    cleaned = true;
    routeIntent = {};
    listeners.clear();
    clearForeground();
    await coordinator.cleanup();
  }

  return {
    getSnapshot,
    subscribe,
    focusSession,
    createSession,
    leaveSession,
    notifySessionDeleted,
    send,
    cancel,
    approve,
    loadMoreHistory,
    cleanup,
  };
}
