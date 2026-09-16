import { createJSONStorage, type StateStorage } from 'zustand/middleware';

import { STORAGE_PREFIXES } from '@/constants/storageKeys';

export type StoreScope = 'session' | 'tab';

const STORAGE_PREFIX_BY_SCOPE: Record<StoreScope, string> = {
  session: STORAGE_PREFIXES.storeSession,
  tab: STORAGE_PREFIXES.storeTab,
};

function createNamespacedSessionStorage(scope: StoreScope): StateStorage {
  const prefix = STORAGE_PREFIX_BY_SCOPE[scope];

  return {
    getItem: (name) => sessionStorage.getItem(`${prefix}${name}`),
    setItem: (name, value) => sessionStorage.setItem(`${prefix}${name}`, value),
    removeItem: (name) => sessionStorage.removeItem(`${prefix}${name}`),
  };
}

/** 为 Zustand persist 创建按生命周期隔离的标签页存储。 */
export function createStoreJSONStorage(scope: StoreScope) {
  return createJSONStorage(() => createNamespacedSessionStorage(scope));
}

export function clearStoreStorageScope(scope: StoreScope): void {
  const prefix = STORAGE_PREFIX_BY_SCOPE[scope];

  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith(prefix)) {
      sessionStorage.removeItem(key);
    }
  }
}
