import type { Chat } from '@ai-sdk/react';

import type { WisePenUIMessage } from '@/domains/ChatSession';
import type { WisePenError } from '@/utils/error';

import type {
  SessionApprovalDecision,
  SessionBootstrapKind,
  SessionPhase,
  SessionSendOptions,
  SessionVisibility,
} from '../_common';

export type SessionRuntimeSnapshot = {
  readonly sessionId: string;
  readonly visibility: SessionVisibility;
  readonly phase: SessionPhase;
  readonly error: WisePenError | undefined;
  readonly historyPage: number;
  readonly historyTotalPage: number;
  readonly historyLoadingMore: boolean;
};

export type SessionRuntimeSnapshotUpdate = Partial<Omit<SessionRuntimeSnapshot, 'sessionId'>>;

export interface SessionRuntime {
  readonly chat: Chat<WisePenUIMessage>;

  getSnapshot(): SessionRuntimeSnapshot;
  subscribe(listener: () => void): () => void;

  bootstrap(kind: SessionBootstrapKind): Promise<void>;
  refresh(): Promise<void>;
  setVisibility(visibility: SessionVisibility): void;
  cleanup(): Promise<void>;

  send(query: string, options?: SessionSendOptions): Promise<void>;
  cancel(): Promise<void>;
  approve(decisions: SessionApprovalDecision[]): Promise<void>;
  loadMoreHistory(): Promise<void>;
}
