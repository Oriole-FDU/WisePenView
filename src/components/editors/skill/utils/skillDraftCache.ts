import { INDEXED_DB_NAMES } from '@/constants/storageKeys';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { SkillWorkspaceDraftState } from '../models/workspaceDraft';

const DB_VERSION = 2;
const STORE_NAME = 'skillDrafts';
const DRAFT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_DRAFT_CACHE_BYTES = 8 * 1024 * 1024;

export interface SkillDraftCacheSnapshot {
  accountId: string;
  schemaVersion?: 2;
  resourceId: string;
  draftVersion: number;
  cacheToken?: string;
  workspace: SkillWorkspaceDraftState;
  updatedAt: number;
}

type StoredSkillDraftCacheSnapshot = SkillDraftCacheSnapshot & {
  cacheKey: string;
};

function createSkillDraftCacheKey(resourceId: string, accountId: string): string {
  return `${encodeURIComponent(accountId)}:${encodeURIComponent(resourceId)}`;
}

function openSkillDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXED_DB_NAMES.skillDraftCache, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
        return;
      }
      // v1 使用 resourceId 作为主键，无法证明账号归属；直接丢弃旧快照。
      db.deleteObjectStore(STORE_NAME);
      db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
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

function isExpiredSkillDraftCache(snapshot: SkillDraftCacheSnapshot): boolean {
  return (
    !Number.isFinite(snapshot.updatedAt) || Date.now() - snapshot.updatedAt > DRAFT_CACHE_TTL_MS
  );
}

function estimateSkillDraftCacheBytes(snapshot: SkillDraftCacheSnapshot): number {
  const seen = new Set<object>();
  let blobBytes = 0;

  const collectBlobBytes = (value: unknown): void => {
    if (value instanceof Blob) {
      blobBytes += value.size;
      return;
    }
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach(collectBlobBytes);
      return;
    }
    Object.values(value).forEach(collectBlobBytes);
  };

  collectBlobBytes(snapshot.workspace);
  const serialized = JSON.stringify(snapshot.workspace) ?? '';
  return new TextEncoder().encode(serialized).byteLength + blobBytes;
}

async function pruneSkillDraftCache(): Promise<void> {
  const db = await openSkillDraftDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const request = transaction.objectStore(STORE_NAME).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const snapshot = cursor.value as SkillDraftCacheSnapshot & { cacheKey?: string };
      const cacheKey =
        typeof snapshot.accountId === 'string' && typeof snapshot.resourceId === 'string'
          ? createSkillDraftCacheKey(snapshot.resourceId, snapshot.accountId)
          : '';
      if (
        !snapshot.accountId ||
        snapshot.cacheKey !== cacheKey ||
        isExpiredSkillDraftCache(snapshot) ||
        estimateSkillDraftCacheBytes(snapshot) > MAX_DRAFT_CACHE_BYTES
      ) {
        cursor.delete();
      }
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  }).finally(() => db.close());
}

export async function saveSkillDraftCache(snapshot: SkillDraftCacheSnapshot): Promise<IDBValidKey> {
  const accountId = snapshot.accountId.trim();
  if (!accountId) {
    throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_DRAFT_CACHE_FAILED, {
      operation: 'account',
    });
  }
  if (estimateSkillDraftCacheBytes(snapshot) > MAX_DRAFT_CACHE_BYTES) {
    throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_DRAFT_CACHE_FAILED, {
      operation: 'capacity',
    });
  }
  await pruneSkillDraftCache().catch(() => undefined);
  const storedSnapshot: StoredSkillDraftCacheSnapshot = {
    ...snapshot,
    accountId,
    cacheKey: createSkillDraftCacheKey(snapshot.resourceId, accountId),
  };
  return withSkillDraftStore('readwrite', (store) => store.put(storedSnapshot));
}

export async function loadSkillDraftCache(
  resourceId: string,
  accountId: string
): Promise<SkillDraftCacheSnapshot | undefined> {
  const normalizedAccountId = accountId.trim();
  if (!normalizedAccountId) return undefined;
  await pruneSkillDraftCache().catch(() => undefined);
  const snapshot = await withSkillDraftStore('readonly', (store) =>
    store.get(createSkillDraftCacheKey(resourceId, normalizedAccountId))
  );
  if (!snapshot) return undefined;
  if (
    snapshot.accountId === normalizedAccountId &&
    snapshot.cacheKey === createSkillDraftCacheKey(resourceId, normalizedAccountId) &&
    !isExpiredSkillDraftCache(snapshot)
  )
    return snapshot;
  await clearSkillDraftCache(resourceId, normalizedAccountId).catch(() => undefined);
  return undefined;
}

export function clearSkillDraftCache(resourceId: string, accountId: string): Promise<undefined> {
  const normalizedAccountId = accountId.trim();
  if (!normalizedAccountId) return Promise.resolve(undefined);
  return withSkillDraftStore('readwrite', (store) =>
    store.delete(createSkillDraftCacheKey(resourceId, normalizedAccountId))
  );
}
