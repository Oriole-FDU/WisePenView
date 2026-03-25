import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

/** y-websocket 运行时混入 Observable 的 on/off；类型声明不完整，仅描述本类订阅所需形状 */
type YWebSocketObservable = {
  on: (name: string, fn: (...args: unknown[]) => void) => void;
  off: (name: string, fn: (...args: unknown[]) => void) => void;
};

function parseYWebsocketStatusPayload(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (arg && typeof arg === 'object' && 'status' in arg) {
    return String((arg as { status: unknown }).status);
  }
  return '';
}

/**
 * 会话连接层对外信号：
 * - `onReady`：**仅**首轮 Yjs `sync` 成功时触发一次（用于「会话可编辑」）。
 * - `onConnectionEstablished`：每次 `status === 'connected'`（含自动重连后）触发，用于清除断线类 UI。
 * - `onDisconnected`：`status === 'disconnected'`。
 */
export interface SessionConnectionCallbacks {
  onSessionReady: () => void;
  onDisconnected?: () => void;
  onConnectionEstablished?: () => void;
}

/** 与 RxJS Subscription 类似：`unsubscribe` 可多次调用，重复为 no-op */
export interface SessionConnectionSubscription {
  unsubscribe: () => void;
}

/**
 * 笔记协同 WebSocket：在 y-websocket 上固定 path、query（resourceId / userId），并支持发送意图元数据帧。
 * 与 HTTP 类 NoteService 分离，供 EditorRoom 等协同层使用。
 */
export class WisepenProvider extends WebsocketProvider {
  constructor(
    serverUrl: string,
    resourceId: string,
    doc: Y.Doc,
    userId: string,
    options?: { connect?: boolean }
  ) {
    // y-websocket 默认把第二参数拼在 URL 后；传 'ws' 最终形如 ws://host/note-collab/ws?resourceId=...
    // connect: false 时由调用方在注册好 status/sync 监听后再 connect()，避免本地极快连上时错过 connected 事件
    super(serverUrl, 'ws', doc, {
      connect: options?.connect ?? true,
      params: {
        resourceId,
        userId,
      },
    });
  }

  /**
   * 监听会话连接：见 {@link SessionConnectionCallbacks}。
   * 返回 {@link SessionConnectionSubscription}，`unsubscribe` 适于 effect cleanup / 超时；重复调用为 no-op。
   */
  watchSessionConnection(callbacks: SessionConnectionCallbacks): SessionConnectionSubscription {
    const observable = this as unknown as YWebSocketObservable;
    let readyEmitted = false;

    const emitReady = () => {
      if (readyEmitted) return;
      readyEmitted = true;
      callbacks.onSessionReady();
    };

    const onStatus = (...args: unknown[]) => {
      const status = parseYWebsocketStatusPayload(args[0]);
      if (status === 'connected') {
        callbacks.onConnectionEstablished?.();
        return;
      }
      if (status === 'disconnected') {
        callbacks.onDisconnected?.();
      }
    };

    const onSync = (...args: unknown[]) => {
      if (args[0] !== false) {
        emitReady();
      }
    };

    observable.on('status', onStatus);
    observable.on('sync', onSync);

    let unsubscribed = false;
    const unsubscribe = () => {
      if (unsubscribed) return;
      unsubscribed = true;
      observable.off('status', onStatus);
      observable.off('sync', onSync);
    };
    return { unsubscribe };
  }

  sendIntent(
    operationType: 'COPY' | 'PASTE' | 'UNDO' | 'REDO' | 'KEYBOARD' | 'OTHER',
    source?: string
  ): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const intentMsg = JSON.stringify({
        type: 'meta',
        intent: { operationType, source },
      });
      this.ws.send(intentMsg);
    }
  }
}
