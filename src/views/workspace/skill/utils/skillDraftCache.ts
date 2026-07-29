import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { SkillWorkspaceDraftState } from '../_models/workspaceDraft';

const DB_NAME = 'wisepen-skill-draft-cache';
const DB_VERSION = 1;
const STORE_NAME = 'skillDrafts';
const DRAFT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface SkillDraftCacheSnapshot {
  schemaVersion?: 2;
  resourceId: string;
  draftVersion: number;
  cacheToken?: string;
  workspace: SkillWorkspaceDraftState;
  updatedAt: number;
}

function openSkillDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'resourceId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        createClientError(
          FRONTEND_CLIENT_ERROR.SKILL_DRAFT_CACHE_FAILED,
          { operation: 'open' },
          request.error
        )
      );
  });
}

async function withSkillDraftStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openSkillDraftDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = action(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        createClientError(
          FRONTEND_CLIENT_ERROR.SKILL_DRAFT_CACHE_FAILED,
          { operation: 'request' },
          request.error
        )
      );
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(
        createClientError(
          FRONTEND_CLIENT_ERROR.SKILL_DRAFT_CACHE_FAILED,
          { operation: 'write' },
          transaction.error
        )
      );
    };
  });
}

export function saveSkillDraftCache(snapshot: SkillDraftCacheSnapshot): Promise<IDBValidKey> {
  return withSkillDraftStore('readwrite', (store) => store.put(snapshot));
}

function isExpiredSkillDraftCache(snapshot: SkillDraftCacheSnapshot): boolean {
  return (
    !Number.isFinite(snapshot.updatedAt) || Date.now() - snapshot.updatedAt > DRAFT_CACHE_TTL_MS
  );
}

export async function loadSkillDraftCache(
  resourceId: string
): Promise<SkillDraftCacheSnapshot | undefined> {
  const snapshot = await withSkillDraftStore('readonly', (store) => store.get(resourceId));
  if (!snapshot) return undefined;
  if (!isExpiredSkillDraftCache(snapshot)) return snapshot;
  await clearSkillDraftCache(resourceId).catch(() => undefined);
  return undefined;
}

export function clearSkillDraftCache(resourceId: string): Promise<undefined> {
  return withSkillDraftStore('readwrite', (store) => store.delete(resourceId));
}
