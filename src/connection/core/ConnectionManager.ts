import type { ConnectionAdapter } from './ConnectionAdapter';
import type { RetryStrategy } from './RetryStrategies';
import { RetryStrategies } from './RetryStrategies';
import type { ConnectionStatus } from './ConnectionStatus';

/**
 * ConnectionManager is the manager of the connection.
 * It gives upper layer a unified interface to manage the connection status.
 *
 * @example
 * const manager = new ConnectionManager(adapter, retryStrategy);
 * manager.connect();
 * manager.disconnect();
 * manager.status;
 * manager.isDataFlowAvailable;
 */

export class ConnectionManager {
  private readonly adapter: ConnectionAdapter;
  private readonly retryStrategy: RetryStrategy;
  private _status: ConnectionStatus = 'idle';
  private _retryCount = 0;
  private _lastDelay: number | undefined;
  /** subscribe contract with useSyncExternalStore: only indicates "snapshot has changed", read status via `status` */
  private _subscribers = new Set<() => void>();

  // given adapter and retry strategy, initialize the connection manager
  constructor(
    adapter: ConnectionAdapter,
    retryStrategy: RetryStrategy = RetryStrategies.exponential()
  ) {
    this.adapter = adapter;
    this.retryStrategy = retryStrategy;
    // initialize the adapter, inject callbacks
    this.adapter.setup({
      onConnected: () => this.handleConnected(),
      onDisconnected: () => this.handleDisconnected(),
      onError: () => this.handleError(),
    });
  }

  // private methods
  private handleConnected() {
    this._retryCount = 0;
    this._lastDelay = undefined;
    this.updateStatus('connected');
  }

  private handleError() {
    if (this._status === 'disconnecting') return;
    this.startReconnecting();
  }

  private handleDisconnected() {
    if (this._status === 'disconnecting') {
      this.updateStatus('idle');
    } else {
      this.startReconnecting();
    }
  }

  private startReconnecting() {
    const delay = this.retryStrategy({
      retryCount: this._retryCount,
      lastDelay: this._lastDelay,
    });
    if (delay !== null) {
      this.updateStatus('reconnecting');
      this._lastDelay = delay;

      setTimeout(() => {
        this._retryCount++;
        void this.adapter.open();
      }, delay);
    } else {
      this.updateStatus('error');
    }
  }

  // public methods
  public get isDataFlowAvailable(): boolean {
    return this._status === 'connected';
  }

  public get status(): ConnectionStatus {
    return this._status;
  }

  public async connect() {
    if (this._status === 'connected' || this._status === 'connecting') return;
    this.updateStatus('connecting');
    await this.adapter.open();
  }

  public async disconnect() {
    this.updateStatus('disconnecting');
    await this.adapter.close();
  }

  private updateStatus(next: ConnectionStatus) {
    this._status = next;
    this._subscribers.forEach((fn) => fn());
  }

  /**
   * Subscribe to status changes (used internally and by useSyncExternalStore).
   * Always read the new state via `status`.
   * Uses an arrow function to ensure a stable reference on the instance, preventing `this` loss when passed as a callback.
   */
  subscribe = (onStoreChange: () => void): (() => void) => {
    this._subscribers.add(onStoreChange);
    return () => this._subscribers.delete(onStoreChange);
  };
}

/**
 * 供 {@link ConnectionDataFlow} 实现监听「是否允许数据侧写/同步」：与 {@link ConnectionManager.isDataFlowAvailable} 同步。
 * 会先按当前状态调用一次 `listener`，之后在 manager 任意状态变更时再次调用。
 *
 * @returns 取消订阅（连接池 `dispose` 时应在 `ConnectionDataFlow.dispose` 中调用，避免泄漏）
 */
export function subscribeDataFlowAvailability(
  manager: ConnectionManager,
  listener: (available: boolean) => void
): () => void {
  const emit = () => listener(manager.isDataFlowAvailable);
  emit();
  return manager.subscribe(emit);
}
