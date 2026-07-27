import { useUnmount } from 'ahooks';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

import { NoteSaveStatusObserver } from './NoteSaveStatusObserver';
import { NoteStatusObserver } from './NoteStatusObserver';
import { WisepenProvider } from './WisepenProvider';

/** y-indexeddb 存储键：单条笔记一个 room，与 resourceId 对应（不承诺离线冷启动可打开） */
export function noteYjsIdbRoomName(resourceId: string): string {
  return `wisepen-note:${resourceId}`;
}

type IndexeddbSyncedObservable = {
  synced: boolean;
  on: (name: 'synced', fn: () => void) => void;
  off: (name: 'synced', fn: () => void) => void;
};

class NoteIndexeddbSyncObserver {
  private _synced: boolean;
  private readonly _subscribers = new Set<() => void>();
  private _detach: (() => void) | null = null;

  constructor(idb: IndexeddbPersistence | null) {
    if (!idb) {
      this._synced = true;
      return;
    }
    const observable = idb as IndexeddbPersistence & IndexeddbSyncedObservable;
    this._synced = observable.synced;

    const handleSynced = () => {
      this.updateSynced(true);
    };

    observable.on('synced', handleSynced);
    this._detach = () => observable.off('synced', handleSynced);
  }

  detach(): void {
    this._detach?.();
    this._detach = null;
    this._subscribers.clear();
  }

  private updateSynced(next: boolean): void {
    if (this._synced === next) return;
    this._synced = next;
    this._subscribers.forEach((fn) => fn());
  }

  getSnapshot = (): boolean => this._synced;

  subscribe = (onStoreChange: () => void): (() => void) => {
    this._subscribers.add(onStoreChange);
    return () => this._subscribers.delete(onStoreChange);
  };
}

export interface UseNoteSessionOptions {
  actorUserId?: string;
  enabled?: boolean;
  /** Mock 预览使用本地 Y.Doc，不连接协同服务。 */
  localOnly?: boolean;
}

export function useNoteSession(resourceId: string, options: UseNoteSessionOptions = {}) {
  const { actorUserId, enabled = true, localOnly = false } = options;
  const [session] = useState(() => {
    const doc = new Y.Doc();
    const provider = new WisepenProvider(resourceId, doc, { connect: false });
    const idb = localOnly ? null : new IndexeddbPersistence(noteYjsIdbRoomName(resourceId), doc);
    const observer = new NoteStatusObserver();
    const saveObserver = new NoteSaveStatusObserver();
    const idbObserver = new NoteIndexeddbSyncObserver(idb);
    observer.attach(provider);
    saveObserver.attach(doc, provider);

    const reconnect = () => {
      observer.setConnecting();
      provider.disconnect();
      provider.connect();
    };

    const destroy = () => {
      observer.detach();
      saveObserver.detach();
      idbObserver.detach();
      provider.destroy();
      void idb?.destroy();
      doc.destroy();
    };

    return { doc, provider, observer, saveObserver, idbObserver, reconnect, destroy };
  });

  const status = useSyncExternalStore(session.observer.subscribe, session.observer.getSnapshot);
  const saveStatus = useSyncExternalStore(
    session.saveObserver.subscribe,
    session.saveObserver.getSnapshot
  );
  const idbSynced = useSyncExternalStore(
    session.idbObserver.subscribe,
    session.idbObserver.getSnapshot
  );

  /**
   * @wisepen-manual-effect
   * 执行时机：用户身份或连接开关变化时，更新协同连接参数并重连 WebSocket provider。
   * 不可替代原因：WebSocket 是外部资源，连接状态必须与当前用户和页面可用态同步。
   * cleanup：断开当前连接；Session 持有的 Yjs/IndexedDB 资源统一在组件卸载时销毁。
   */
  useEffect(() => {
    session.provider.setActorUserId(actorUserId);
    if (enabled && !localOnly) {
      session.observer.setConnecting();
      session.provider.connect();
    } else {
      session.provider.disconnect();
    }
    return () => session.provider.disconnect();
  }, [actorUserId, enabled, localOnly, session]);

  useUnmount(() => session.destroy());

  return {
    status: localOnly ? ('connected' as const) : status,
    saveStatus: localOnly ? ('saved' as const) : saveStatus,
    doc: session.doc,
    provider: session.provider,
    reconnect: session.reconnect,
    idbSynced: localOnly || idbSynced,
  };
}
