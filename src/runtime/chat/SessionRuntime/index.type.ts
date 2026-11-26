import type { Chat } from '@ai-sdk/react';

import type { WisePenUIMessage } from '@/domains/ChatSession';

import type { SessionApprovalDecision, SessionPhase, SessionSendOptions } from '../_common';

export type SessionRuntimeSnapshot = {
  readonly sessionId: string;
  readonly phase: SessionPhase;
  readonly historyPage: number;
  readonly historyTotalPage: number;
  readonly historyLoadingMore: boolean;
};

export type SessionRuntimeSnapshotUpdate = Partial<Omit<SessionRuntimeSnapshot, 'sessionId'>>;

export interface SessionRuntime {
  readonly chat: Chat<WisePenUIMessage>;

  getSnapshot(): SessionRuntimeSnapshot;
  subscribe(listener: () => void): () => void;

  refresh(): Promise<void>;
  cleanup(): Promise<void>;

  send(query: string, options?: SessionSendOptions): Promise<void>;
  cancel(): Promise<void>;
  approve(decisions: SessionApprovalDecision[]): Promise<void>;
  loadMoreHistory(): Promise<void>;
}
