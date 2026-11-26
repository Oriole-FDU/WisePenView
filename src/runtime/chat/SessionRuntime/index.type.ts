import type { Chat } from '@ai-sdk/react';

import type { WisePenUIMessage } from '@/domains/ChatSession';

import type { SessionApprovalDecision, SessionSendOptions } from '../_common';
import type { SessionOperation } from '../_common/sessionState';

export type SessionRuntimeSnapshot = {
  readonly chat: Chat<WisePenUIMessage>;
  readonly operation: SessionOperation;
  readonly initialHistory: 'loading' | 'ready' | 'error';
  readonly historyPage: number;
  readonly historyTotalPage: number;
  readonly historyLoadingMore: boolean;
};

export type SessionRuntimeSnapshotUpdate = Partial<Omit<SessionRuntimeSnapshot, 'chat'>>;

export interface SessionRuntime {
  getSnapshot(): SessionRuntimeSnapshot;
  subscribe(listener: () => void): () => void;

  isBusy(): boolean;
  refresh(options?: { revalidate?: boolean }): Promise<void>;
  cleanup(): Promise<void>;

  send(query: string, options?: SessionSendOptions, agentId?: string | null): Promise<void>;
  cancel(): Promise<void>;
  approve(decisions: SessionApprovalDecision[]): Promise<void>;
  loadMoreHistory(): Promise<void>;
}
