/**
 * IndexedDB 数据库初始化
 * 用于缓存离线期间未同步的变更（append-only）
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { JsonDelta, Block } from '@/types/note';

const DB_NAME = 'WisePenDB';
const DB_VERSION = 1;

/** Pending Delta 记录（append-only 存储） */
export interface PendingDeltaRecord {
  id?: number; // 自增 ID，保证顺序
  noteId: string;
  delta: JsonDelta;
  createdAt: number;
}

/** Note 快照记录：用于断网瞬间的文档快照 */
export interface NoteSnapshotRecord {
  noteId: string;
  version: number;
  blocks: Block[];
  title?: string;
  createdAt: number;
}

export interface WisePenDB {
  pendingDeltas: {
    key: number;
    value: PendingDeltaRecord;
    indexes: { noteId: string };
  };
  noteSnapshots: {
    key: string;
    value: NoteSnapshotRecord;
    indexes: {};
  };
}

let dbInstance: IDBPDatabase<WisePenDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<WisePenDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<WisePenDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains('pendingDeltas')) {
        const store = db.createObjectStore('pendingDeltas', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('noteId', 'noteId', { unique: false });
      }

      if (!db.objectStoreNames.contains('noteSnapshots')) {
        db.createObjectStore('noteSnapshots', {
          keyPath: 'noteId',
        });
      }
    },
  });

  return dbInstance;
}

export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
