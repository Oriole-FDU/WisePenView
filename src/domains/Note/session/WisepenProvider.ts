import { getApiBaseUrl, notifyAddrFailure } from '@/apis/apiServerAddr';
import { getXDeveloper } from '@/apis/developmentTraffic';
import { WebsocketProvider } from 'y-websocket';
import type * as Y from 'yjs';

export interface WisepenProviderOptions {
  connect?: boolean;
  actorUserId?: string;
}

function getNoteCollaborationWsUrl(): string {
  const url = new URL('/note-collab', getApiBaseUrl());
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString().replace(/\/$/, '');
}

/** 笔记协同 WebSocket：固定 path、resourceId query，支持发送意图元数据帧。 */
export class WisepenProvider extends WebsocketProvider {
  constructor(resourceId: string, doc: Y.Doc, options?: WisepenProviderOptions) {
    // 第二参数 'ws' 被 y-websocket 拼到 URL 末段，最终形如 ws://host/note-collab/ws?resourceId=...
    // connect: false 让调用方先注册 status/sync 监听再 connect()，防止极快连上时错过 connected 事件
    const actorUserId = options?.actorUserId?.trim();
    const xDeveloper = getXDeveloper();
    super(getNoteCollaborationWsUrl(), 'ws', doc, {
      connect: options?.connect ?? true,
      disableBc: true,
      params: {
        resourceId,
        ...(actorUserId ? { actorUserId } : {}),
        ...(xDeveloper ? { developer: xDeveloper } : {}),
      },
    });

    // 传输层失败时反馈给地址探测模块；WS URL 在构造期固化，切换链路需上层重建 Provider。
    this.on('connection-error', () => {
      notifyAddrFailure();
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
