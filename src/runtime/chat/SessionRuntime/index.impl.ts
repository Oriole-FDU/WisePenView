import { Chat } from '@ai-sdk/react';

import { getChatTurnService } from '@/domains';
import type { WisePenUIMessage } from '@/domains/ChatSession';
import type { IChatTurnService } from '@/domains/ChatTurn/service/index.type';
import { captureException } from '@/observability';
import {
  createClientError,
  FRONTEND_CLIENT_ERROR,
  isWisePenError,
  type WisePenError,
} from '@/utils/error';

import type {
  SessionApprovalDecision,
  SessionBootstrapKind,
  SessionSendOptions,
  SessionVisibility,
} from '../_common';
import {
  type SessionRuntimeSnapshot,
  SessionRuntimeState,
  type SessionRuntimeStateUpdate,
} from '../model/SessionRuntimeState';
import { createChatTransport } from './createChatTransport';
import type { SessionRuntime as SessionRuntimeContract } from './index.type';

const HISTORY_PAGE_SIZE = 100;

export class SessionRuntime implements SessionRuntimeContract {
  readonly chat: Chat<WisePenUIMessage>;

  private readonly state: SessionRuntimeState;
  private readonly chatTurnService: IChatTurnService;

  private cleaned = false;
  private readonly listeners = new Set<(state: SessionRuntimeSnapshot) => void>();

  constructor(sessionId: string) {
    this.state = new SessionRuntimeState(sessionId);
    this.chatTurnService = getChatTurnService();
    this.chat = new Chat<WisePenUIMessage>({
      id: sessionId,
      transport: createChatTransport(this.chatTurnService),
      onError: (error) => {
        if (this.cleaned) return;
        const convertedError = toWisePenError(error, 'SessionRuntime 流错误');
        captureException(convertedError, {
          detector: 'application-handled',
          operation: 'chat.stream',
        });
        this.updateState({
          phase: 'error',
          error: convertedError,
        });
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 接口方法
  // ---------------------------------------------------------------------------

  getSnapshot(): SessionRuntimeSnapshot {
    return this.state.snapshot();
  }

  subscribe(listener: (state: SessionRuntimeSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async bootstrap(kind: SessionBootstrapKind): Promise<void> {
    this.assertAlive();
    try {
      if (kind === 'createSession') {
        this.updateState({ phase: 'idle' });
        return;
      }

      const history = await this.chatTurnService.listHistoryMessages(
        this.state.sessionId,
        1,
        HISTORY_PAGE_SIZE
      );
      this.assertAlive();
      this.chat.messages = history.list;

      const activeTurnId = await this.chatTurnService.getActiveTurnId(this.state.sessionId);
      this.assertAlive();

      if (activeTurnId) {
        this.updateState({ phase: 'streaming' });
        await this.chat.resumeStream({ body: { session_id: this.state.sessionId } });
        this.assertAlive();
        return;
      }

      this.updateState({ phase: 'idle' });
    } catch (error) {
      if (this.cleaned) return;
      const convertedError = toWisePenError(error, 'SessionRuntime bootstrap 失败');
      captureException(convertedError, {
        detector: 'application-handled',
        operation: 'chat.bootstrap',
      });
      this.updateState({
        phase: 'error',
        error: convertedError,
      });
      throw convertedError;
    }
  }

  setVisibility(visibility: SessionVisibility): void {
    this.assertAlive();
    if (this.state.visibility === visibility) return;
    this.updateState({ visibility });
  }

  async cleanup(): Promise<void> {
    if (this.cleaned) return;
    this.cleaned = true;
    this.listeners.clear();
    this.chat.stop();
  }

  async send(_query: string, _options?: SessionSendOptions): Promise<void> {}

  async cancel(): Promise<void> {}

  async approve(_decisions: SessionApprovalDecision[]): Promise<void> {}

  // ---------------------------------------------------------------------------
  // 私有方法
  // ---------------------------------------------------------------------------

  private updateState(update: SessionRuntimeStateUpdate): void {
    this.state.update(update);
    const snapshot = this.state.snapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private assertAlive(): void {
    if (!this.cleaned) return;
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'SessionRuntime 已 cleanup',
    });
  }
}

function toWisePenError(error: unknown, reason: string): WisePenError {
  if (isWisePenError(error)) return error;
  return createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, { reason }, error);
}
