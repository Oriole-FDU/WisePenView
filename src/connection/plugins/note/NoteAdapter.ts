import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

import type { ConnectionAdapter } from '@/connection/core/ConnectionAdapter';

import type { NoteIntentOperation, NoteYjsSocket } from './noteYjsSocket.type';
import { noteYjsIdbRoomName } from './noteYjs.constants';

/** y-websocket 运行时混入 Observable 的 on/off；类型声明不完整 */
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

const SESSION_CONNECT_TIMEOUT_MS = 5_000;

/**
 * y-websocket 传输：path、query（resourceId）、`sendIntent`。
 * 不导出；由 {@link NoteAdapter} 独占创建，对外形状见 {@link NoteYjsSocket}。
 */
class NoteYjsWebsocket extends WebsocketProvider {
  constructor(serverUrl: string, resourceId: string, doc: Y.Doc, options?: { connect?: boolean }) {
    super(serverUrl, 'ws', doc, {
      connect: options?.connect ?? true,
      params: {
        resourceId,
      },
    });
  }

  sendIntent(operationType: NoteIntentOperation, source?: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const intentMsg = JSON.stringify({
        type: 'meta',
        intent: { operationType, source },
      });
      this.ws.send(intentMsg);
    }
  }
}

/**
 * 笔记协同：`ConnectionAdapter` 门面 + 在 `open` 内创建传输实例 / Y.Doc / IndexedDB。
 * 重连由 {@link ConnectionManager} 调度 `open()`。
 */
export class NoteAdapter implements ConnectionAdapter {
  private readonly resourceId: string;
  private hooks: {
    onConnected: () => void;
    onDisconnected: () => void;
    onError: (err: unknown) => void;
  } | null = null;

  private doc: Y.Doc | null = null;
  private idb: IndexeddbPersistence | null = null;
  private wsProvider: NoteYjsWebsocket | null = null;
  private connectTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private readonly detachListeners: Array<() => void> = [];
  private readonly resourceListeners = new Set<() => void>();
  private resourceVersion = 0;

  constructor(resourceId: string) {
    this.resourceId = resourceId;
  }

  private pingResources(): void {
    this.resourceVersion++;
    this.resourceListeners.forEach((fn) => fn());
  }

  /** 供 UI 在 `open` 创建 doc 后触发重渲染（`createConnectionHook` 仅靠 status 时 snapshot 可能不变）。 */
  subscribeResources = (onChange: () => void): (() => void) => {
    this.resourceListeners.add(onChange);
    return () => this.resourceListeners.delete(onChange);
  };

  getResourceVersion(): number {
    return this.resourceVersion;
  }

  getDoc(): Y.Doc | null {
    return this.doc;
  }

  getProvider(): NoteYjsSocket | null {
    return this.wsProvider;
  }

  setup(hooks: {
    onConnected: () => void;
    onDisconnected: () => void;
    onError: (err: unknown) => void;
  }): void {
    this.hooks = hooks;
  }

  private clearConnectTimeout(): void {
    if (this.connectTimeoutId !== undefined) {
      window.clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = undefined;
    }
  }

  private getCollabServerUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//test.api.fudan.wisepen.oriole.cn:9080/note-collab`;
  }

  private attachProviderListeners(): void {
    if (!this.wsProvider || !this.hooks) return;

    const observable = this.wsProvider as unknown as YWebSocketObservable;
    const hooks = this.hooks;

    const onStatus = (...args: unknown[]) => {
      const status = parseYWebsocketStatusPayload(args[0]);
      if (status === 'disconnected') {
        hooks.onDisconnected();
      }
    };

    const onSync = (...args: unknown[]) => {
      if (args[0] !== false) {
        this.clearConnectTimeout();
        hooks.onConnected();
      }
    };

    const onConnectionError = (...args: unknown[]) => {
      this.clearConnectTimeout();
      hooks.onError(args[0] ?? new Error('connection-error'));
    };

    observable.on('status', onStatus);
    observable.on('sync', onSync);
    observable.on('connection-error', onConnectionError);

    this.detachListeners.push(() => {
      observable.off('status', onStatus);
      observable.off('sync', onSync);
      observable.off('connection-error', onConnectionError);
    });
  }

  private startConnectTimeout(): void {
    this.clearConnectTimeout();
    this.connectTimeoutId = window.setTimeout(() => {
      this.connectTimeoutId = undefined;
      this.hooks?.onError(new Error('SESSION_CONNECT_TIMEOUT'));
    }, SESSION_CONNECT_TIMEOUT_MS);
  }

  async open(): Promise<void> {
    if (!this.hooks) return;

    if (!this.wsProvider) {
      const newDoc = new Y.Doc();
      this.doc = newDoc;
      this.idb = new IndexeddbPersistence(noteYjsIdbRoomName(this.resourceId), newDoc);
      const wsProvider = new NoteYjsWebsocket(this.getCollabServerUrl(), this.resourceId, newDoc, {
        connect: false,
      });
      this.wsProvider = wsProvider;
      this.attachProviderListeners();
      this.pingResources();
      this.startConnectTimeout();
      wsProvider.connect();
      return;
    }

    this.startConnectTimeout();
    this.wsProvider.connect();
  }

  async close(): Promise<void> {
    this.clearConnectTimeout();
    this.detachListeners.splice(0).forEach((d) => d());

    if (this.wsProvider) {
      this.wsProvider.destroy();
      this.wsProvider = null;
    }
    if (this.idb) {
      void this.idb.destroy();
      this.idb = null;
    }
    if (this.doc) {
      this.doc.destroy();
      this.doc = null;
    }
    this.pingResources();
  }
}
