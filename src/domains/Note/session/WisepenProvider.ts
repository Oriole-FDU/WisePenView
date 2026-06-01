import { getApiServerAddr, notifyAddrFailure } from '@/apis/apiServerAddr';
import { WebsocketProvider } from 'y-websocket';
import type * as Y from 'yjs';

export function getNoteUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${getApiServerAddr()}/note-collab`;
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
