/**
 * Pluggable transport boundary for `ConnectionManager`: one adapter wraps one concrete connection
 * (WebSocket, WebRTC, HTTP long-poll, etc.). The manager calls `open` / `close` and relies on
 * `setup` hooks to drive its state machine when the underlying link becomes ready, drops, or fails.
 *
 * @example Yjs — a `y-websocket` provider (or similar) can implement this by mapping provider
 * lifecycle to hooks: call `onConnected` when the doc syncs / socket is open, `onDisconnected`
 * when the socket closes cleanly, and `onError` on failure; `open` starts the provider (or
 * reconnect), `close` destroys or disconnects it.
 *
 * ```ts
 * // Illustrative shape — wire real events from your Yjs provider:
 * class YjsWebsocketAdapter implements ConnectionAdapter {
 *   setup(hooks) {
 *     this.provider.on('synced', () => hooks.onConnected());
 *     this.provider.on('connection-close', () => hooks.onDisconnected());
 *     this.provider.on('connection-error', (_e) => hooks.onError(_e));
 *   }
 *   async open() { this.provider.connect(); }
 *   async close() { this.provider.destroy(); }
 * }
 * ```
 */

export interface ConnectionAdapter {
  open: () => Promise<void>;
  close: () => Promise<void>;
  // 注入钩子，让适配器通知管理器底层变化
  setup: (hooks: {
    onConnected: () => void;
    onDisconnected: () => void;
    onError: (err: unknown) => void;
  }) => void;
}
