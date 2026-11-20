/**
 * 按固定 session 恢复未完成 turn：合并并发、支持取消。
 */
import { captureException } from '@/observability';

import type { IChatTurnService } from '../../service/index.type';
import type { ChatMessage } from '../message/chatMessage';
import type { ConnectFsm } from './connectFsm';

export interface ConnectResumeOptions {
  sessionId: string;
  service: IChatTurnService;
  connect: ConnectFsm;
  message: ChatMessage;
  onError?: (error: Error) => void;
  isDisposed: () => boolean;
}

export class ConnectResume {
  private inFlight: {
    promise: Promise<void>;
    controller: AbortController;
  } | null = null;
  private resumeEpoch = 0;
  private readonly options: ConnectResumeOptions;

  constructor(options: ConnectResumeOptions) {
    this.options = options;
  }

  cancelResume(): void {
    this.resumeEpoch += 1;
    const inFlight = this.inFlight;
    this.inFlight = null;
    inFlight?.controller.abort();
  }

  resumeTurn(): Promise<void> {
    const existing = this.inFlight;
    if (existing) return existing.promise;

    if (this.options.connect.isLive()) {
      return Promise.resolve();
    }

    const controller = new AbortController();
    const promise = (async () => {
      const epoch = this.resumeEpoch;
      const isStale = () =>
        this.resumeEpoch !== epoch || this.options.isDisposed() || controller.signal.aborted;

      this.options.connect.beginConnect();
      try {
        const turnId = await this.options.service.getActiveTurnId(
          this.options.sessionId,
          controller.signal
        );
        if (isStale()) return;
        if (!turnId) {
          this.options.connect.markIdle();
          return;
        }

        const response = await this.options.service.reconnectChatStream(
          this.options.sessionId,
          controller.signal
        );
        if (isStale()) {
          void response.body?.cancel();
          return;
        }

        this.options.connect.markOpen();
        await this.options.message.pumpResume({ response });
        if (isStale()) return;
        this.options.connect.markIdleIfOpen();
      } catch (error) {
        if (isStale()) return;
        this.options.connect.markClosed();
        captureException(error, {
          detector: 'application-handled',
          operation: 'chat.resume',
        });
        if (error instanceof Error) {
          this.options.onError?.(error);
        }
      } finally {
        if (this.inFlight?.controller === controller) {
          this.inFlight = null;
        }
      }
    })();

    this.inFlight = { promise, controller };
    return promise;
  }

  dispose(): void {
    this.cancelResume();
  }
}
