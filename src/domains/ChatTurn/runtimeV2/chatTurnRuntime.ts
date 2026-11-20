/**
 * 单 session ChatTurn 运行时实例：sessionId 冻结，生命周期与 Router focus 无关。
 */
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type {
  IChatTurnService,
  SendTurnMessageOptions,
  ToolApprovalStatusRequest,
} from '../service/index.type';
import { ConnectActions } from './connect/connectActions';
import { createConnectFsm } from './connect/connectFsm';
import { ConnectResume } from './connect/connectResume';
import { HistoryData } from './history/historyData';
import { createHistoryLoadingFsm } from './history/historyLoadingFsm';
import { isLifecycleAllowed, LIFECYCLE_PHASE, type LifecyclePhase } from './lifecycle';
import { ChatMessage } from './message/chatMessage';
import type { ChatTurnRuntimePort, RuntimeView } from './types';

export interface ChatTurnRuntimeOptions {
  sessionId: string;
  service: IChatTurnService;
  model?: string;
  onError?: (error: Error) => void;
}

export class ChatTurnRuntime implements ChatTurnRuntimePort {
  readonly sessionId: string;
  private phase: LifecyclePhase = LIFECYCLE_PHASE.created;
  private readonly onError?: (error: Error) => void;
  private readonly listeners = new Set<() => void>();
  private readonly message: ChatMessage;
  private readonly connect = createConnectFsm();
  private readonly historyLoading = createHistoryLoadingFsm();
  private readonly history: HistoryData;
  private readonly resume: ConnectResume;
  private readonly actions: ConnectActions;
  private cancelling = false;

  constructor(options: ChatTurnRuntimeOptions) {
    this.sessionId = options.sessionId;
    this.onError = options.onError;

    this.message = new ChatMessage({
      onError: options.onError,
      onChange: () => this.emit(),
    });

    this.history = new HistoryData({
      sessionId: options.sessionId,
      service: options.service,
      setMessages: this.message.setMessages,
      loading: this.historyLoading,
      onChange: () => this.emit(),
    });

    this.resume = new ConnectResume({
      sessionId: options.sessionId,
      service: options.service,
      connect: this.connect,
      message: this.message,
      onError: options.onError,
      isDisposed: () => this.phase === LIFECYCLE_PHASE.disposed,
    });

    this.actions = new ConnectActions({
      sessionId: options.sessionId,
      model: options.model,
      service: options.service,
      connect: this.connect,
      message: this.message,
      resume: this.resume,
      onCancellingChange: (cancelling) => {
        this.cancelling = cancelling;
        this.emit();
      },
    });
  }

  get lifecycle(): LifecyclePhase {
    return this.phase;
  }

  get chat() {
    return this.message.chat;
  }

  getView(): RuntimeView {
    const connectPhase = this.connect.getPhase();
    return {
      lifecycle: this.phase,
      connectPhase,
      messages: this.message.messages,
      status: this.message.status,
      loadingInitial: this.historyLoading.loadingInitial,
      loadingMore: this.historyLoading.loadingMore,
      canLoadMore: this.history.canLoadMore,
      cancelling: this.cancelling,
      connectActive: connectPhase === 'connecting' || connectPhase === 'open',
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async bootstrap(options: { isNewSession: boolean }): Promise<void> {
    this.requirePhase([LIFECYCLE_PHASE.created], 'bootstrap');
    this.setPhase(LIFECYCLE_PHASE.bootstrapping);

    try {
      if (!options.isNewSession) {
        const loaded = await this.history.replaceHistory();
        if (this.phase !== LIFECYCLE_PHASE.bootstrapping) return;
        if (!loaded) {
          throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
            reason: '历史首载未完成',
          });
        }
        await this.resume.resumeTurn();
        if (this.phase !== LIFECYCLE_PHASE.bootstrapping) return;
      }
      this.setPhase(LIFECYCLE_PHASE.ready);
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  dispose(): void {
    if (this.phase === LIFECYCLE_PHASE.disposed || this.phase === LIFECYCLE_PHASE.disposing) {
      return;
    }
    this.setPhase(LIFECYCLE_PHASE.disposing);
    this.actions.dispose();
    this.resume.dispose();
    this.history.dispose();
    this.message.dispose();
    this.connect.reset();
    this.setPhase(LIFECYCLE_PHASE.disposed);
    this.listeners.clear();
  }

  async send(query: string, options?: SendTurnMessageOptions): Promise<void> {
    this.requirePhase([LIFECYCLE_PHASE.ready], 'send');
    await this.actions.send(query, options);
  }

  async cancel(): Promise<void> {
    this.requirePhase([LIFECYCLE_PHASE.ready], 'cancel');
    await this.actions.cancel();
  }

  async submitToolApprovals(statuses: ToolApprovalStatusRequest[]): Promise<void> {
    this.requirePhase([LIFECYCLE_PHASE.ready], 'submitToolApprovals');
    await this.actions.submitToolApprovals(statuses);
  }

  async loadMore(): Promise<void> {
    this.requirePhase([LIFECYCLE_PHASE.ready], 'loadMore');
    try {
      await this.history.prependHistory();
    } catch (error) {
      if (error instanceof Error) this.onError?.(error);
      throw error;
    }
  }

  private requirePhase(allowed: readonly LifecyclePhase[], action: string): void {
    if (!isLifecycleAllowed(this.phase, allowed)) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: `ChatTurnRuntime 在 ${this.phase} 阶段不允许 ${action}`,
      });
    }
  }

  private setPhase(phase: LifecyclePhase): void {
    this.phase = phase;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
