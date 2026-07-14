import type * as Y from 'yjs';
import type { Transaction } from 'yjs';

import type { WisepenProvider } from './WisepenProvider';

export type NoteSaveStatus = 'saving' | 'saved' | 'waiting';

const SAVE_SETTLE_DELAY_MS = 600;
const OUTBOUND_CHECK_INTERVAL_MS = 100;

/** y-websocket 运行时混入 Observable 的 on/off；这里只声明保存状态所需事件。 */
type YWebSocketObservable = {
  on: (name: string, fn: (...args: unknown[]) => void) => void;
  off: (name: string, fn: (...args: unknown[]) => void) => void;
};

function parseStatusPayload(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (arg && typeof arg === 'object' && 'status' in arg) {
    return String((arg as { status: unknown }).status);
  }
  return '';
}

/** 观察本地 Yjs 更新及 WebSocket 发送队列，提供正文自动保存状态。 */
export class NoteSaveStatusObserver {
  private _status: NoteSaveStatus = 'saving';
  private readonly _subscribers = new Set<() => void>();
  private readonly _detachFns: Array<() => void> = [];
  private _settleTimer: ReturnType<typeof setTimeout> | null = null;
  private _hasPendingLocalUpdate = false;
  private _provider: WisepenProvider | null = null;

  attach(doc: Y.Doc, provider: WisepenProvider): void {
    this._provider = provider;
    const observable = provider as unknown as YWebSocketObservable;

    const onStatus = (...args: unknown[]) => {
      const status = parseStatusPayload(args[0]);
      if (status === 'connected') {
        this.updateStatus('saving');
        if (this._hasPendingLocalUpdate) {
          this.scheduleSettle();
        }
        return;
      }
      if (status === 'disconnected') {
        this.clearSettleTimer();
        this.updateStatus('waiting');
      }
    };

    const onSync = (...args: unknown[]) => {
      if (args[0] === false) return;
      if (this._hasPendingLocalUpdate) {
        this.scheduleSettle();
        return;
      }
      this.updateStatus('saved');
    };

    const onDocumentUpdate = (
      _update: Uint8Array,
      origin: unknown,
      _doc: Y.Doc,
      transaction: Transaction
    ) => {
      if (!transaction.local || origin === provider) return;

      this._hasPendingLocalUpdate = true;
      if (!provider.wsconnected) {
        this.clearSettleTimer();
        this.updateStatus('waiting');
        return;
      }

      this.updateStatus('saving');
      this.scheduleSettle();
    };

    observable.on('status', onStatus);
    observable.on('sync', onSync);
    doc.on('update', onDocumentUpdate);

    this._detachFns.push(() => {
      observable.off('status', onStatus);
      observable.off('sync', onSync);
      doc.off('update', onDocumentUpdate);
    });
  }

  detach(): void {
    this.clearSettleTimer();
    this._detachFns.splice(0).forEach((fn) => fn());
    this._provider = null;
    this._subscribers.clear();
  }

  private clearSettleTimer(): void {
    if (this._settleTimer === null) return;
    clearTimeout(this._settleTimer);
    this._settleTimer = null;
  }

  private scheduleSettle(delay = SAVE_SETTLE_DELAY_MS): void {
    this.clearSettleTimer();
    this._settleTimer = setTimeout(() => {
      this._settleTimer = null;
      const provider = this._provider;
      if (!provider?.wsconnected) {
        this.updateStatus('waiting');
        return;
      }
      if ((provider.ws?.bufferedAmount ?? 0) > 0) {
        this.scheduleSettle(OUTBOUND_CHECK_INTERVAL_MS);
        return;
      }

      this._hasPendingLocalUpdate = false;
      this.updateStatus('saved');
    }, delay);
  }

  private updateStatus(next: NoteSaveStatus): void {
    if (this._status === next) return;
    this._status = next;
    this._subscribers.forEach((fn) => fn());
  }

  getSnapshot = (): NoteSaveStatus => this._status;

  subscribe = (onStoreChange: () => void): (() => void) => {
    this._subscribers.add(onStoreChange);
    return () => this._subscribers.delete(onStoreChange);
  };
}
