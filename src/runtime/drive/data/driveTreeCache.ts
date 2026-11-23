import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { DriveNodeChildrenPage, DriveNodeScope } from '@/domains/Drive';
import { registerStore } from '@/store/lifecycle';
import { createStoreJSONStorage } from '@/store/persistence';

import type { DriveTreeLoadConfig } from '../model/DriveTreeState';

const DRIVE_CHILDREN_CACHE_TTL_MS = 30_000;

interface DriveChildrenCacheOptions {
  scope: DriveNodeScope;
  parentId: string;
  cursor?: string;
  load?: DriveTreeLoadConfig;
}

const buildChildrenCacheKey = ({
  scope,
  parentId,
  cursor,
  load,
}: DriveChildrenCacheOptions): string => {
  const kinds = load?.kinds?.toSorted().join(',') ?? 'all';
  return [
    scope.rootId,
    parentId,
    cursor ?? '',
    kinds,
    load?.resourceType?.trim().toLowerCase() ?? '',
    load?.pageSize ?? '',
  ].join('\u0000');
};

export class DriveTreeDataCache {
  private readonly children = new Map<
    string,
    {
      scopeRootId: string;
      expiresAt: number;
      page: DriveNodeChildrenPage;
    }
  >();

  getChildren(options: DriveChildrenCacheOptions): DriveNodeChildrenPage | undefined {
    const key = buildChildrenCacheKey(options);
    const entry = this.children.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.children.delete(key);
      return undefined;
    }
    return entry.page;
  }

  setChildren(
    options: DriveChildrenCacheOptions,
    page: DriveNodeChildrenPage
  ): DriveNodeChildrenPage {
    this.children.set(buildChildrenCacheKey(options), {
      scopeRootId: options.scope.rootId,
      expiresAt: Date.now() + DRIVE_CHILDREN_CACHE_TTL_MS,
      page,
    });
    return page;
  }

  invalidateScope(scopeRootId: string): void {
    for (const [key, entry] of this.children) {
      if (entry.scopeRootId === scopeRootId) {
        this.children.delete(key);
      }
    }
  }

  clear(): void {
    this.children.clear();
  }
}

interface DriveExpansionState {
  expandedNodeIdsByScope: Record<string, string[]>;
  setExpandedNodeIds: (scopeRootId: string, nodeIds: readonly string[]) => void;
}

const DEFAULT_DRIVE_EXPANSION_STATE = {
  expandedNodeIdsByScope: {} as Record<string, string[]>,
};

const useDriveExpansionCache = create<DriveExpansionState>()(
  persist(
    (set) => ({
      ...DEFAULT_DRIVE_EXPANSION_STATE,
      setExpandedNodeIds: (scopeRootId, nodeIds) =>
        set((state) => {
          const normalizedNodeIds = [...new Set(nodeIds)];
          const currentNodeIds = state.expandedNodeIdsByScope[scopeRootId] ?? [];
          if (
            currentNodeIds.length === normalizedNodeIds.length &&
            currentNodeIds.every((nodeId, index) => nodeId === normalizedNodeIds[index])
          ) {
            return state;
          }
          return {
            expandedNodeIdsByScope: {
              ...state.expandedNodeIdsByScope,
              [scopeRootId]: normalizedNodeIds,
            },
          };
        }),
    }),
    {
      name: 'drive-tree-expansion',
      storage: createStoreJSONStorage('session'),
      version: 1,
      migrate: () => DEFAULT_DRIVE_EXPANSION_STATE,
    }
  )
);

export const getDriveExpandedNodeIds = (scopeRootId: string): ReadonlySet<string> =>
  new Set(useDriveExpansionCache.getState().expandedNodeIdsByScope[scopeRootId] ?? []);

export const setDriveExpandedNodeIds = (scopeRootId: string, nodeIds: readonly string[]): void => {
  useDriveExpansionCache.getState().setExpandedNodeIds(scopeRootId, nodeIds);
};

const resetDriveExpansionCache = (): void => {
  useDriveExpansionCache.setState(DEFAULT_DRIVE_EXPANSION_STATE);
};

registerStore({
  id: 'drive.tree-expansion',
  scope: 'session',
  reset: resetDriveExpansionCache,
});
