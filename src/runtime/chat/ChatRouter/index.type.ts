import type { Chat } from '@ai-sdk/react';

import type { WisePenUIMessage } from '@/domains/ChatSession';

import type { ChatRouterSendRequest, SessionApprovalDecision } from '../_common';
import type { SessionRuntimeSnapshot } from '../SessionRuntime/index.type';

export type ChatRouterSnapshot = {
  readonly sessionId: string | null;
  readonly chat: Chat<WisePenUIMessage> | null;
  readonly runtime: SessionRuntimeSnapshot | null;
};

export interface ChatRouter {
  getSnapshot(): ChatRouterSnapshot;
  subscribe(listener: () => void): () => void;

  focusSession(sessionId: string): Promise<void>;
  createSession(): Promise<string | undefined>;
  leaveSession(route?: { sessionId: string | undefined }): void;
  notifySessionDeleted(sessionId: string): Promise<void>;

  send(query: string, request: ChatRouterSendRequest): Promise<void>;
  cancel(sessionId: string): Promise<void>;
  approve(sessionId: string, decisions: SessionApprovalDecision[]): Promise<void>;
  loadMoreHistory(sessionId: string): Promise<void>;
  cleanup(): Promise<void>;
}
