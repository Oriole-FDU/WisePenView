import { getApiServerAddr, notifyAddrFailure } from '@/apis/apiServerAddr';
import { WebsocketProvider } from 'y-websocket';
import type * as Y from 'yjs';

const devDeveloperParam = import.meta.env.DEV ? import.meta.env.VITE_X_DEVELOPER.trim() : '';
const NOTE_COLLAB_PATH = '/note-collab';

function toWsNoteCollabUrl(addr: string, fallbackProtocol: 'ws:' | 'wss:'): string {
  const trimmed = addr.trim().replace(/\/+$/, '');
  if (!trimmed) return '';

  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed);
  const rawUrl = hasProtocol ? trimmed : `${fallbackProtocol}//${trimmed}`;
  const url = new URL(rawUrl);

  url.protocol = url.protocol === 'https:' || url.protocol === 'wss:' ? 'wss:' : 'ws:';
  const pathname = url.pathname.replace(/\/+$/, '');
  url.pathname = pathname.endsWith(NOTE_COLLAB_PATH)
    ? pathname
    : `${pathname}${NOTE_COLLAB_PATH}`;
  url.search = '';
  url.hash = '';

  return url.toString().replace(/\/$/, '');
}

export function getNoteUrl(): string {
  const protocol: 'ws:' | 'wss:' = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const explicitWsAddr = import.meta.env.VITE_NOTE_COLLAB_WS_ADDR?.trim();
  if (explicitWsAddr) {
    return toWsNoteCollabUrl(explicitWsAddr, protocol);
  }

  const apiServerAddr = getApiServerAddr().replace(/\/+$/, '');
  if (apiServerAddr.startsWith('/')) {
    const devProxyTarget = import.meta.env.DEV
      ? import.meta.env.VITE_DEV_API_PROXY_TARGET?.trim()
      : '';
    if (devProxyTarget) {
      return toWsNoteCollabUrl(devProxyTarget, protocol);
    }
    return `${protocol}//${window.location.host}${apiServerAddr}/note-collab`;
  }
  return toWsNoteCollabUrl(apiServerAddr, protocol);
}

/** 笔记协同 WebSocket：固定 path、resourceId query，支持发送意图元数据帧。 */
export class WisepenProvider extends WebsocketProvider {
  constructor(resourceId: string, doc: Y.Doc, options?: { connect?: boolean }) {
    // 第二参数 'ws' 被 y-websocket 拼到 URL 末段，最终形如 ws://host/note-collab/ws?resourceId=...
    // connect: false 让调用方先注册 status/sync 监听再 connect()，防止极快连上时错过 connected 事件
    super(getNoteUrl(), 'ws', doc, {
      connect: options?.connect ?? true,
      disableBc: true,
      params: {
        resourceId,
        ...(devDeveloperParam ? { developer: devDeveloperParam } : {}),
      },
    });

    // 传输层失败时反馈给 ping 模块加速 HTTP 收敛；WS 自身的 URL 在构造期已固化，
    // 不会跟着新地址重连，需上层销毁并重建 Provider 才能切换 WS 链路。
    this.on('connection-error', () => {
      notifyAddrFailure();
    });
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
