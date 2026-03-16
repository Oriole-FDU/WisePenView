/**
 * ConnectionStateController - 连接状态与重试
 * 维护 online/offline，指数退避重试，window online/offline 监听。
 */

export type ConnectionState = 'online' | 'offline';

export interface ConnectionStateControllerOptions {
  retryBaseMs: number;
  retryMaxMs: number;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onEnterOffline: () => void;
  onEnterOnline: () => void;
  attemptReconnect: () => void;
}

export class ConnectionStateController {
  private connectionState: ConnectionState = 'online';
  private readonly retryBaseMs: number;
  private currentRetryMs: number;
  private readonly retryMaxMs: number;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onConnectionStateChange?: (state: ConnectionState) => void;
  private readonly onEnterOffline: () => void;
  private readonly onEnterOnline: () => void;
  private readonly attemptReconnect: () => void;
  private readonly onlineListener: () => void;
  private readonly offlineListener: () => void;

  constructor(options: ConnectionStateControllerOptions) {
    this.retryBaseMs = options.retryBaseMs;
    this.currentRetryMs = options.retryBaseMs;
    this.retryMaxMs = options.retryMaxMs;
    this.onConnectionStateChange = options.onConnectionStateChange;
    this.onEnterOffline = options.onEnterOffline;
    this.onEnterOnline = options.onEnterOnline;
    this.attemptReconnect = options.attemptReconnect;
    this.onlineListener = () => this.handleOnline();
    this.offlineListener = () => this.handleOffline();
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  isOffline(): boolean {
    return this.connectionState === 'offline';
  }

  enterOfflineMode(): void {
    if (this.connectionState === 'offline') return;
    this.connectionState = 'offline';
    this.currentRetryMs = this.retryBaseMs;
    this.onConnectionStateChange?.('offline');
    this.onEnterOffline();
  }

  enterOnlineMode(): void {
    if (this.connectionState === 'online') return;
    this.connectionState = 'online';
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.onConnectionStateChange?.('online');
    this.onEnterOnline();
  }

  scheduleRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.attemptReconnect();
    }, this.currentRetryMs);
  }

  /** 浏览器 online 时立即尝试重连，重置退避 */
  triggerReconnectNow(): void {
    this.currentRetryMs = this.retryBaseMs;
    void this.attemptReconnect();
  }

  getCurrentRetryMs(): number {
    return this.currentRetryMs;
  }

  setBackoffMs(ms: number): void {
    this.currentRetryMs = Math.min(ms, this.retryMaxMs);
  }

  private handleOnline(): void {
    if (this.connectionState !== 'offline') return;
    this.currentRetryMs = this.retryBaseMs;
    void this.attemptReconnect();
  }

  private handleOffline(): void {
    this.enterOfflineMode();
  }

  registerWindowListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onlineListener);
      window.addEventListener('offline', this.offlineListener);
    }
  }

  unregisterWindowListeners(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineListener);
      window.removeEventListener('offline', this.offlineListener);
    }
  }

  dispose(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.unregisterWindowListeners();
  }
}
