import { NOTE_COLLABORATION_WS_URL } from '@/apis/clientUrls';
import { getXDeveloper } from '@/apis/developmentTraffic';
import { WebsocketProvider } from 'y-websocket';
import type * as Y from 'yjs';

export interface WisepenProviderOptions {
  connect?: boolean;
  actorUserId?: string;
}

/** 笔记协同 WebSocket：固定 path、resourceId query，支持发送意图元数据帧。 */
export class WisepenProvider extends WebsocketProvider {
  constructor(resourceId: string, doc: Y.Doc, options?: WisepenProviderOptions) {
    // VITE_NOTE_COLLAB_WS_URL 固定为协同入口，第二参数 'ws' 被 y-websocket 拼到 URL 末段。
    // connect: false 让调用方先注册 status/sync 监听再 connect()，防止极快连上时错过 connected 事件
    const actorUserId = options?.actorUserId?.trim();
    const xDeveloper = getXDeveloper();
    super(NOTE_COLLABORATION_WS_URL, 'ws', doc, {
      connect: options?.connect ?? true,
      disableBc: true,
      params: {
        resourceId,
        ...(actorUserId ? { actorUserId } : {}),
        ...(xDeveloper ? { developer: xDeveloper } : {}),
      },
    });
  }

  setActorUserId(actorUserId?: string): void {
    const normalizedActorUserId = actorUserId?.trim();
    if (normalizedActorUserId) {
      this.params.actorUserId = normalizedActorUserId;
      return;
    }
    delete this.params.actorUserId;
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
