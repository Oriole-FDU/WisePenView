import { useState, useSyncExternalStore } from 'react';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

import { useEffectForce } from '@/hooks/useEffectForce';

import { NoteStatusObserver } from './NoteStatusObserver';
import { WisepenProvider } from './WisepenProvider';

/** y-indexeddb 存储键：单条笔记一个 room，与 resourceId 对应（不承诺离线冷启动可打开） */
export function noteYjsIdbRoomName(resourceId: string): string {
  return `wisepen-note:${resourceId}`;
}

type NoteSession = {
  doc: Y.Doc;
  provider: WisepenProvider;
  idb: IndexeddbPersistence;
  observer: NoteStatusObserver;
  reconnect: () => void;
  destroy: () => Promise<void>;
};

function createNoteSession(resourceId: string): NoteSession {
  const doc = new Y.Doc();
  const provider = new WisepenProvider(resourceId, doc, { connect: false });
  const idb = new IndexeddbPersistence(noteYjsIdbRoomName(resourceId), doc);
  const observer = new NoteStatusObserver();
  observer.attach(provider);

  const reconnect = () => {
    observer.reset();
    provider.disconnect();
    provider.connect();
  };

  const destroy = async () => {
    observer.detach();
    provider.disconnect();
    provider.destroy();
    await idb.destroy();
    doc.destroy();
  };

  return { doc, provider, idb, observer, reconnect, destroy };
}

export function useNoteSession(resourceId: string) {
  const [session] = useState(() => createNoteSession(resourceId));

  const status = useSyncExternalStore(session.observer.subscribe, session.observer.getSnapshot);
  const [idbSynced, setIdbSynced] = useState(() => session.idb.synced);

  /**
   * 执行时机：当前笔记 session 创建后，监听 y-indexeddb 首次同步完成并设置超时兜底。
   * 不可替代原因：IndexedDB 同步状态来自外部 persistence promise，不能由渲染状态派生。
   * cleanup：取消过期 promise 回写并清理兜底定时器，避免切换笔记或卸载后更新状态。
   */
  useEffectForce(() => {
    setIdbSynced(session.idb.synced);

    let cancelled = false;
    void session.idb.whenSynced.then(() => {
      if (!cancelled) {
        setIdbSynced(true);
      }
    });
    const idbFallbackTimer = window.setTimeout(() => {
      if (!cancelled) {
        setIdbSynced(true);
      }
    }, 8000);

    return () => {
      cancelled = true;
      window.clearTimeout(idbFallbackTimer);
    };
  }, [session, resourceId]);

  /**
   * 执行时机：当前笔记 session 挂载后连接协同 provider，并在卸载时释放完整 session。
   * 不可替代原因：provider、IndexedDB persistence 和 Y.Doc 都是外部资源，必须成对建立和释放。
   * cleanup：断开 provider、销毁 IndexedDB persistence、observer 与 Y.Doc，避免复用已销毁 provider。
   */
  useEffectForce(() => {
    session.provider.connect();
    return () => void session.destroy();
  }, [session, resourceId]);

  return {
    status,
    doc: session.doc,
    provider: session.provider,
    reconnect: session.reconnect,
    idbSynced,
  };
}
