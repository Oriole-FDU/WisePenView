/**
 * 固定 session 的 send / cancel / 审批续跑（无跨 session 覆盖）。
 */
import { captureException } from '@/observability';

import type {
  IChatTurnService,
  SendTurnMessageOptions,
  ToolApprovalStatusRequest,
} from '../../service/index.type';
import type { ChatMessage } from '../message/chatMessage';
import type { ConnectFsm } from './connectFsm';
import type { ConnectResume } from './connectResume';
import { runNewStreamConnect } from './runNewStreamConnect';

export interface ConnectActionsOptions {
  sessionId: string;
  model?: string;
  service: IChatTurnService;
  connect: ConnectFsm;
  message: ChatMessage;
  resume: ConnectResume;
  onCancellingChange?: (cancelling: boolean) => void;
}

export class ConnectActions {
  private activeOperation: {
    controller: AbortController;
  } | null = null;
  private cancelling = false;
  private readonly options: ConnectActionsOptions;

  constructor(options: ConnectActionsOptions) {
    this.options = options;
  }

  stopConnect(): void {
    this.cancelActiveOperation();
    this.options.resume.cancelResume();
    this.options.message.stop();
    this.options.connect.markClosed();
  }

  async send(query: string, sendOptions?: SendTurnMessageOptions): Promise<void> {
    if (this.options.connect.isLive() || this.activeOperation) return;

    const operation = this.beginOperation();
    try {
      await runNewStreamConnect({
        connect: this.options.connect,
        shouldApply: operation.isCurrent,
        run: async () => {
          const response = await this.options.service.streamChatCompletion(
            {
              sessionId: this.options.sessionId,
              model: sendOptions?.model ?? this.options.model,
              query,
              options: sendOptions,
            },
            operation.signal
          );
          if (!operation.isCurrent()) {
            void response.body?.cancel();
            return;
          }
          this.options.connect.markOpen();
          await this.options.message.pumpSend({
            response,
            turn: { query, options: sendOptions },
          });
        },
      });
    } finally {
      operation.finish();
    }
  }

  async cancel(): Promise<void> {
    if (this.cancelling) return;

    this.setCancelling(true);
    try {
      this.stopConnect();
      await this.options.service.cancelTurn(this.options.sessionId);
    } finally {
      this.setCancelling(false);
    }
  }

  async submitToolApprovals(toolApprovalStatus: ToolApprovalStatusRequest[]): Promise<void> {
    const command = {
      sessionId: this.options.sessionId,
      toolApprovalStatus,
    };
    let operation: ReturnType<ConnectActions['beginOperation']> | null = null;

    try {
      if (this.options.connect.isLive()) {
        await this.options.service.respondTurn(command);
        return;
      }

      const currentOperation = this.beginOperation();
      operation = currentOperation;
      const activeTurnId = await this.options.service.getActiveTurnId(
        this.options.sessionId,
        currentOperation.signal
      );
      if (!currentOperation.isCurrent()) return;
      const action = this.options.connect.resolveContinuation(activeTurnId);

      if (action === 'respond') {
        await this.options.service.respondTurn(command);
        return;
      }

      if (action === 'respond_resume') {
        await this.options.service.respondTurn(command);
        if (!currentOperation.isCurrent()) return;
        this.options.resume.cancelResume();
        await this.options.resume.resumeTurn();
        return;
      }

      await runNewStreamConnect({
        connect: this.options.connect,
        shouldApply: currentOperation.isCurrent,
        run: async () => {
          const response = await this.options.service.recoverChatStream(
            command,
            currentOperation.signal
          );
          if (!currentOperation.isCurrent()) {
            void response.body?.cancel();
            return;
          }
          this.options.connect.markOpen();
          await this.options.message.pumpSend({ response });
        },
      });
    } catch (error) {
      if (operation && !operation.isCurrent()) return;
      captureException(error, {
        detector: 'application-handled',
        operation: 'chat.approval',
      });
      throw error;
    } finally {
      operation?.finish();
    }
  }

  dispose(): void {
    this.stopConnect();
  }

  private beginOperation() {
    const operation = {
      controller: new AbortController(),
    };
    this.activeOperation = operation;
    return {
      signal: operation.controller.signal,
      isCurrent: () => this.activeOperation === operation,
      finish: () => {
        if (this.activeOperation === operation) this.activeOperation = null;
      },
    };
  }

  private cancelActiveOperation(): void {
    const operation = this.activeOperation;
    this.activeOperation = null;
    operation?.controller.abort();
  }

  private setCancelling(cancelling: boolean): void {
    this.cancelling = cancelling;
    this.options.onCancellingChange?.(cancelling);
  }
}
