import { useMemo, useSyncExternalStore } from 'react';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

import { useEffectForce } from '@/hooks/useEffectForce';

import { NoteStatusObserver } from './NoteStatusObserver';
import { WisepenProvider } from './WisepenProvider';

/** y-indexeddb 存储键：单条笔记一个 room，与 resourceId 对应（不承诺离线冷启动可打开） */
export function noteYjsIdbRoomName(resourceId: string): string {
  return `wisepen-note:${resourceId}`;
}

export function useNoteSession(resourceId: string, actorUserId?: string) {
  const session = useMemo(() => {
    const doc = new Y.Doc();
    const provider = new WisepenProvider(resourceId, doc, { connect: false, actorUserId });
    const idb = new IndexeddbPersistence(noteYjsIdbRoomName(resourceId), doc);
    const observer = new NoteStatusObserver();
    observer.attach(provider);

    const reconnect = () => {
      provider.disconnect();
      provider.connect();
    };

    const destroy = () => {
      observer.detach();
      provider.destroy();
      void idb.destroy();
      doc.destroy();
    };

    return { doc, provider, observer, reconnect, destroy };
  }, [resourceId, actorUserId]);

  const status = useSyncExternalStore(session.observer.subscribe, session.observer.getSnapshot);

  /**
   * 执行时机：resourceId 变化生成新的协同 session 后，连接 WebSocket/Yjs provider。
   * 不可替代原因：provider、IndexedDB 持久化和 Y.Doc 都是外部资源，必须在挂载后建立并在卸载时释放。
   * cleanup：断开 provider、销毁 IndexedDB persistence、observer 与 Y.Doc，避免同一笔记残留连接。
   */
  useEffectForce(() => {
    session.provider.connect();
    return () => {
      session.destroy();
    };
  }, [session]);

  return { status, doc: session.doc, provider: session.provider, reconnect: session.reconnect };
}
