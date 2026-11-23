import { Chat } from '@ai-sdk/react';

import { getChatTurnService } from '@/domains';
import type { WisePenUIMessage } from '@/domains/ChatSession';
import type { IChatTurnService } from '@/domains/ChatTurn/service/index.type';

import type { SessionApprovalDecision, SessionSendOptions, SessionVisibility } from '../_common';
import type { SessionRuntime as SessionRuntimeContract, SessionRuntimeState } from './index.type';

export class SessionRuntime implements SessionRuntimeContract {
  readonly chat: Chat<WisePenUIMessage>;

  private readonly sessionId: string;
  private readonly chatTurnService: IChatTurnService;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.chatTurnService = getChatTurnService();
    this.chat = new Chat<WisePenUIMessage>({ id: sessionId });
  }

  getSnapshot(): SessionRuntimeState {
    return {
      sessionId: this.sessionId,
      visibility: 'background',
      phase: 'idle',
      bootstrapStatus: 'idle',
      error: undefined,
    };
  }

  subscribe(_listener: (state: SessionRuntimeState) => void): () => void {
    return () => undefined;
  }

  async bootstrap(): Promise<void> {}

  setVisibility(_visibility: SessionVisibility): void {}

  async cleanup(): Promise<void> {}

  async send(_query: string, _options?: SessionSendOptions): Promise<void> {}

  async cancel(): Promise<void> {}

  async approve(_decisions: SessionApprovalDecision[]): Promise<void> {}
}
