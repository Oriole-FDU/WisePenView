import type { CreateSessionRequest } from '@/domains/ChatSession';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { SessionApprovalDecision, SessionSendOptions } from '../_common';
import type { SessionRuntimeSnapshot } from '../model/SessionRuntimeState';
import type { SessionCoordinator } from '../SessionCoordinator/index.type';
import type { SessionRuntime } from '../SessionRuntime/index.type';
import type { ChatRouter as ChatRouterContract, ChatRouterSnapshot } from './index.type';

export class ChatRouter implements ChatRouterContract {
  private readonly coordinator: SessionCoordinator;

  private foreground: SessionRuntime | null = null;
  private unsubscribeForeground: (() => void) | null = null;
  private readonly listeners = new Set<(snapshot: ChatRouterSnapshot) => void>();

  constructor(coordinator: SessionCoordinator) {
    this.coordinator = coordinator;
  }

  getSnapshot(): ChatRouterSnapshot {
    return this.buildSnapshot();
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

  async notifySessionDeleted(sessionId: string): Promise<void> {
    const wasForeground = this.foreground?.getSnapshot().sessionId === sessionId;
    await this.coordinator.dispose(sessionId);
    if (wasForeground) {
      this.clearForeground();
    }
  }

  async send(query: string, options?: SessionSendOptions): Promise<void> {
    if (!this.foreground) {
      await this.createSession();
    }
    const runtime = this.requireForeground();
    await runtime.send(query, options);
  }

  async cancel(): Promise<void> {
    await this.requireForeground().cancel();
  }

  async approve(decisions: SessionApprovalDecision[]): Promise<void> {
    await this.requireForeground().approve(decisions);
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
    const snapshot = this.buildSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
