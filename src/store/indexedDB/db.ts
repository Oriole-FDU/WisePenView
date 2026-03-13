/**
 * IndexedDB 数据库初始化
 * 使用 idb 库封装 IndexedDB 操作
 */

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'WisePenDB';
const DB_VERSION = 1;

export interface WisePenDB {
  notes: {
    key: string;
    value: {
      noteId: string;
      baseVersion: number;
      seqCounter: number;
      pendingQueue: unknown[];
      updatedAt: number;
    };
  };
}

let dbInstance: IDBPDatabase<WisePenDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<WisePenDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<WisePenDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('notes')) {
        db.createObjectStore('notes', { keyPath: 'noteId' });
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
