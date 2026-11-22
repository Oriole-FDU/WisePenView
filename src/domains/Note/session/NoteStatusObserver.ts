import type { WisepenProvider } from './WisepenProvider';

export type NoteSessionStatus = 'connecting' | 'connected' | 'disconnected';

/**
 * 轻量观察者：监听 WisepenProvider 的 status/sync 事件，维护三态状态，
 * 并暴露 subscribe/getSnapshot 供 useSyncExternalStore 消费。
 */
export class NoteStatusObserver {
  private _status: NoteSessionStatus = 'connecting';
  private readonly _subscribers = new Set<() => void>();
  private readonly _detachFns: Array<() => void> = [];

  attach(provider: WisepenProvider): void {
    const onStatus = provider.on('status', ({ status }) => {
      if (status === 'connected') {
        this.updateStatus('connecting');
        return;
      }
      if (status === 'disconnected') {
        this.updateStatus('disconnected');
      }
    });

    const onSync = provider.on('sync', (synced) => {
      if (synced) {
        this.updateStatus('connected');
      }
    });

    this._detachFns.push(() => {
      provider.off('status', onStatus);
      provider.off('sync', onSync);
    });
  }

  detach(): void {
    this._detachFns.splice(0).forEach((fn) => fn());
  }

  setConnecting(): void {
    this.updateStatus('connecting');
  }

  private updateStatus(next: NoteSessionStatus): void {
    if (this._status === next) return;
    this._status = next;
    this._subscribers.forEach((fn) => fn());
  }

  getSnapshot = (): NoteSessionStatus => this._status;

  subscribe = (onStoreChange: () => void): (() => void) => {
    this._subscribers.add(onStoreChange);
    return () => this._subscribers.delete(onStoreChange);
  };
}
