import type { Chat } from '@ai-sdk/react';

import type { WisePenUIMessage } from '@/domains/ChatSession';

import type {
  SessionApprovalDecision,
  SessionBootstrapStatus,
  SessionPhase,
  SessionSendOptions,
  SessionVisibility,
} from '../_common';

export interface SessionRuntimeState {
  readonly sessionId: string;
  readonly visibility: SessionVisibility;
  readonly phase: SessionPhase;
  readonly bootstrapStatus: SessionBootstrapStatus;
  readonly error: Error | undefined;
}

export interface SessionRuntime {
  readonly chat: Chat<WisePenUIMessage>;

  getSnapshot(): SessionRuntimeState;
  subscribe(listener: (state: SessionRuntimeState) => void): () => void;

  bootstrap(): Promise<void>;
  setVisibility(visibility: SessionVisibility): void;
  cleanup(): Promise<void>;

  send(query: string, options?: SessionSendOptions): Promise<void>;
  cancel(): Promise<void>;
  approve(decisions: SessionApprovalDecision[]): Promise<void>;
}
