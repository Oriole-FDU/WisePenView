import type { Chat } from '@ai-sdk/react';
import type { ChatStatus } from 'ai';

import type { WisePenUIMessage } from '../entity/message';
import type { SendTurnMessageOptions, ToolApprovalStatusRequest } from '../service/index.type';
import type { ConnectPhase } from './connect/connectFsm';
import type { LifecyclePhase } from './lifecycle';

export interface RuntimeView {
  lifecycle: LifecyclePhase;
  connectPhase: ConnectPhase;
  messages: WisePenUIMessage[];
  status: ChatStatus;
  loadingInitial: boolean;
  loadingMore: boolean;
  canLoadMore: boolean;
  cancelling: boolean;
  connectActive: boolean;
}

export interface ChatTurnRuntimePort {
  readonly sessionId: string;
  readonly lifecycle: LifecyclePhase;
  readonly chat: Chat<WisePenUIMessage>;

  bootstrap(options: { isNewSession: boolean }): Promise<void>;
  dispose(): void;

  send(query: string, options?: SendTurnMessageOptions): Promise<void>;
  cancel(): Promise<void>;
  submitToolApprovals(statuses: ToolApprovalStatusRequest[]): Promise<void>;
  loadMore(): Promise<void>;

  getView(): RuntimeView;
  subscribe(listener: () => void): () => void;
}
