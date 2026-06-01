import type { WisepenProvider } from './WisepenProvider';

export type NoteSessionStatus = 'connecting' | 'connected' | 'disconnected';

/** y-websocket 运行时混入 Observable 的 on/off；类型声明不完整，仅描述本类订阅所需形状 */
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

/**
 * 轻量观察者：监听 WisepenProvider 的 status/sync 事件，维护三态状态，
 * 并暴露 subscribe/getSnapshot 供 useSyncExternalStore 消费。
 */
export class NoteStatusObserver {
  private _status: NoteSessionStatus = 'connecting';
  private readonly _subscribers = new Set<() => void>();
  private readonly _detachFns: Array<() => void> = [];

  attach(provider: WisepenProvider): void {
    const observable = provider as unknown as YWebSocketObservable;

    const onStatus = (...args: unknown[]) => {
      if (parseStatusPayload(args[0]) === 'disconnected') {
        this.updateStatus('disconnected');
      }
    };

    const onSync = (...args: unknown[]) => {
      if (args[0] !== false) {
        this.updateStatus('connected');
      }
    };

    observable.on('status', onStatus);
    observable.on('sync', onSync);

    this._detachFns.push(() => {
      observable.off('status', onStatus);
      observable.off('sync', onSync);
    });
  }

  detach(): void {
    this._detachFns.splice(0).forEach((fn) => fn());
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
