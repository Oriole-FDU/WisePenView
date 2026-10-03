import { useUnmount } from 'ahooks';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { IndexeddbPersistence } from 'y-indexeddb';
import type * as Y from 'yjs';

import { publicAppConfig } from '@/config/runtimeConfig';
import {
  NoteSaveStatusObserver,
  NoteStatusObserver,
  noteYjsIdbRoomName,
  WisepenProvider,
} from '@/domains/Note';

/** 空白页从挂载起就绑定同一个 Y.Doc，获得资源 ID 后仅在后台启用传输。 */
export function useNewNoteCollaboration(doc: Y.Doc, resourceId: string, actorUserId?: string) {
  const [session] = useState(() => {
    const provider = new WisepenProvider('', doc, { connect: false });
    const observer = new NoteStatusObserver();
    const saveObserver = new NoteSaveStatusObserver();
    observer.attach(provider);
    saveObserver.attach(doc, provider);
    return { doc, provider, observer, saveObserver };
  });
  const status = useSyncExternalStore(session.observer.subscribe, session.observer.getSnapshot);
  const saveStatus = useSyncExternalStore(
    session.saveObserver.subscribe,
    session.saveObserver.getSnapshot
  );
  const localOnly = publicAppConfig.mode === 'mock';

  /**
   * @wisepen-manual-effect
   * 执行时机：首次编辑创建资源并获得账号身份后，为现有 Y.Doc 开启协作与账号隔离的持久化。
   * 不可替代原因：WebSocket 和 IndexedDB 是外部资源，必须跟随资源身份和组件生命周期管理。
   * cleanup：断开传输并关闭持久化；不替换 Y.Doc 或编辑器实例。
   */
  useEffect(() => {
    if (!resourceId || !actorUserId || localOnly) return;
    session.provider.setResourceId(resourceId);
    session.provider.setActorUserId(actorUserId);
    const idb = new IndexeddbPersistence(noteYjsIdbRoomName(resourceId, actorUserId), session.doc);
    session.observer.setConnecting();
    session.provider.connect();
    return () => {
      session.provider.disconnect();
      void idb.destroy();
    };
  }, [actorUserId, localOnly, resourceId, session]);

  useUnmount(() => {
    session.observer.detach();
    session.saveObserver.detach();
    session.provider.destroy();
    session.doc.destroy();
  });
  return {
    ...session,
    status: localOnly && resourceId ? ('connected' as const) : status,
    saveStatus: localOnly && resourceId ? ('saved' as const) : saveStatus,
    reconnect: () => {
      if (!resourceId || !actorUserId || localOnly) return;
      session.observer.setConnecting();
      session.provider.disconnect();
      session.provider.connect();
    },
  };
}
