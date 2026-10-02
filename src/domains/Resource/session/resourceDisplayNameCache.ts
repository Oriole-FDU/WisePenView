import { createStore } from 'zustand/vanilla';

import { registerStore } from '@/store/lifecycle';

interface ResourceDisplayNameCacheState {
  byResourceId: Record<string, string>;
}

const DEFAULT_STATE: ResourceDisplayNameCacheState = { byResourceId: {} };

export const resourceDisplayNameCache = createStore<ResourceDisplayNameCacheState>()(
  () => DEFAULT_STATE
);

export const setResourceDisplayName = (resourceId: string, resourceName: string): void => {
  resourceDisplayNameCache.setState((state) => ({
    byResourceId: { ...state.byResourceId, [resourceId]: resourceName },
  }));
};

const resetResourceDisplayNameCache = (): void => {
  resourceDisplayNameCache.setState(DEFAULT_STATE);
};

registerStore({
  id: 'resource.display-name',
  scope: 'session',
  reset: resetResourceDisplayNameCache,
});
