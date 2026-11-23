import { getChatSessionService } from '@/domains';
import type { CreateSessionRequest, IChatSessionService } from '@/domains/ChatSession';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { ChatRouterSendRequest, SessionApprovalDecision } from '../_common';
import type { SessionRuntimeSnapshot } from '../model/SessionRuntimeState';
import type { SessionCoordinator } from '../SessionCoordinator/index.type';
import type { SessionRuntime } from '../SessionRuntime/index.type';
import type { ChatRouter as ChatRouterContract, ChatRouterSnapshot } from './index.type';

export class ChatRouter implements ChatRouterContract {
  private readonly coordinator: SessionCoordinator;
  private readonly chatSessionService: IChatSessionService;

  private foreground: SessionRuntime | null = null;
  private unsubscribeForeground: (() => void) | null = null;
  private readonly listeners = new Set<(snapshot: ChatRouterSnapshot) => void>();
  private cachedSnapshot: ChatRouterSnapshot = {
    sessionId: null,
    chat: null,
    runtime: null,
  };

  constructor(coordinator: SessionCoordinator) {
    this.coordinator = coordinator;
    this.chatSessionService = getChatSessionService();
  }

  getSnapshot(): ChatRouterSnapshot {
    return this.cachedSnapshot;
  }

  subscribe(listener: (snapshot: ChatRouterSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async focusSession(sessionId: string): Promise<void> {
    if (this.foreground?.getSnapshot().sessionId === sessionId) {
      this.foreground.setVisibility('foreground');
      this.emit();
      return;
    }

    const retainSessionId = this.foreground?.getSnapshot().sessionId ?? null;
    const runtime = await this.coordinator.acquire(sessionId, { retainSessionId });
    this.setForeground(runtime);
  }

  async createSession(params?: CreateSessionRequest): Promise<void> {
    const retainSessionId = this.foreground?.getSnapshot().sessionId ?? null;
    const runtime = await this.coordinator.createSession(params, { retainSessionId });
    this.setForeground(runtime);
  }

  leaveSession(): void {
    if (!this.foreground) return;
    this.foreground.setVisibility('background');
    this.clearForeground();
  }

  async notifySessionDeleted(sessionId: string): Promise<void> {
    const wasForeground = this.foreground?.getSnapshot().sessionId === sessionId;
    await this.coordinator.dispose(sessionId);
    if (wasForeground) {
      this.clearForeground();
    }
  }

  async send(query: string, request?: ChatRouterSendRequest): Promise<void> {
    const { create, ...sendOptions } = request ?? {};

    if (!this.foreground) {
      await this.createSession(create);
    } else if (create && 'agentId' in create) {
      await this.chatSessionService.setSessionAgent({
        sessionId: this.foreground.getSnapshot().sessionId,
        agentId: create.agentId,
      });
    }

    await this.requireForeground().send(query, sendOptions);
  }

  async cancel(): Promise<void> {
    await this.requireForeground().cancel();
  }

  async approve(decisions: SessionApprovalDecision[]): Promise<void> {
    await this.requireForeground().approve(decisions);
  }

  async loadMoreHistory(): Promise<void> {
    await this.requireForeground().loadMoreHistory();
  }

  // ---------------------------------------------------------------------------
  // 私有方法
  // ---------------------------------------------------------------------------

  private setForeground(runtime: SessionRuntime): void {
    const previous = this.foreground;
    if (previous && previous !== runtime) {
      previous.setVisibility('background');
    }

    this.unsubscribeForeground?.();
    this.foreground = runtime;
    runtime.setVisibility('foreground');
    this.unsubscribeForeground = runtime.subscribe(() => {
      this.emit();
    });
    this.emit();
  }

  private clearForeground(): void {
    this.unsubscribeForeground?.();
    this.unsubscribeForeground = null;
    this.foreground = null;
    this.emit();
  }

  private requireForeground(): SessionRuntime {
    if (!this.foreground) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: '当前没有前台会话',
      });
    }
    return this.foreground;
  }

  private buildSnapshot(): ChatRouterSnapshot {
    const runtime = this.foreground;
    if (!runtime) {
      return { sessionId: null, chat: null, runtime: null };
    }
    const snapshot: SessionRuntimeSnapshot = runtime.getSnapshot();
    return {
      sessionId: snapshot.sessionId,
      chat: runtime.chat,
      runtime: snapshot,
    };
  }

  private emit(): void {
    const next = this.buildSnapshot();
    if (isSameRouterSnapshot(this.cachedSnapshot, next)) return;
    this.cachedSnapshot = next;
    for (const listener of this.listeners) {
      listener(next);
    }
  }
}

function isSameRouterSnapshot(left: ChatRouterSnapshot, right: ChatRouterSnapshot): boolean {
  if (left.sessionId !== right.sessionId) return false;
  if (left.chat !== right.chat) return false;
  if (left.runtime === right.runtime) return true;
  if (!left.runtime || !right.runtime) return false;
  return (
    left.runtime.sessionId === right.runtime.sessionId &&
    left.runtime.visibility === right.runtime.visibility &&
    left.runtime.phase === right.runtime.phase &&
    left.runtime.error === right.runtime.error &&
    left.runtime.historyPage === right.runtime.historyPage &&
    left.runtime.historyTotalPage === right.runtime.historyTotalPage &&
    left.runtime.historyLoadingMore === right.runtime.historyLoadingMore
  );
}
