import type { Chat } from '@ai-sdk/react';

import type { WisePenUIMessage } from '@/domains/ChatSession';

import type {
  SessionApprovalDecision,
  SessionBootstrapKind,
  SessionSendOptions,
  SessionVisibility,
} from '../_common';
import type { SessionRuntimeSnapshot } from '../model/SessionRuntimeState';

export type { SessionRuntimeSnapshot as SessionRuntimeState } from '../model/SessionRuntimeState';

export interface SessionRuntime {
  readonly chat: Chat<WisePenUIMessage>;

  getSnapshot(): SessionRuntimeSnapshot;
  subscribe(listener: (state: SessionRuntimeSnapshot) => void): () => void;

  bootstrap(kind: SessionBootstrapKind): Promise<void>;
  setVisibility(visibility: SessionVisibility): void;
  cleanup(): Promise<void>;

  send(query: string, options?: SessionSendOptions): Promise<void>;
  cancel(): Promise<void>;
  approve(decisions: SessionApprovalDecision[]): Promise<void>;

  /** 上翻更早历史；首屏由 bootstrap 写入 */
  loadMoreHistory(): Promise<void>;
}
