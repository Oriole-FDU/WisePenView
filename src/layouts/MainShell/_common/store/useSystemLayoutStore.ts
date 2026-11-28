import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { clampSidebarWidth, MAIN_SIDEBAR_EXPANDED_WIDTH } from '@/constants/layoutScale';
import { registerStore } from '@/store/lifecycle';
import { createStoreJSONStorage } from '@/store/persistence';

interface SystemLayoutState {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
}

const DEFAULT_SYSTEM_LAYOUT_STATE = {
  sidebarCollapsed: false,
  sidebarWidth: MAIN_SIDEBAR_EXPANDED_WIDTH,
};

/** 仅用于将旧版本持久化的默认宽度迁移到新的默认值。 */
const LEGACY_DEFAULT_SIDEBAR_WIDTH = 240;

const migrateSystemLayoutState = (persisted: unknown): typeof DEFAULT_SYSTEM_LAYOUT_STATE => {
  const state = persisted as
    | Partial<{
        adminSidebarWidth: number;
        mainSidebarCollapsed: boolean;
        sidebarCollapsed: boolean;
        sidebarWidth: number;
      }>
    | undefined;
  const persistedWidth = state?.sidebarWidth ?? state?.adminSidebarWidth;
  const sidebarWidth =
    persistedWidth === LEGACY_DEFAULT_SIDEBAR_WIDTH
      ? DEFAULT_SYSTEM_LAYOUT_STATE.sidebarWidth
      : (persistedWidth ?? DEFAULT_SYSTEM_LAYOUT_STATE.sidebarWidth);

  return {
    sidebarCollapsed:
      state?.sidebarCollapsed ??
      state?.mainSidebarCollapsed ??
      DEFAULT_SYSTEM_LAYOUT_STATE.sidebarCollapsed,
    sidebarWidth: clampSidebarWidth(sidebarWidth),
  };
};

export const useSystemLayoutStore = create<SystemLayoutState>()(
  persist(
    (set) => ({
      ...DEFAULT_SYSTEM_LAYOUT_STATE,
      setSidebarCollapsed: (collapsed) =>
        set((state) =>
          state.sidebarCollapsed === collapsed ? state : { sidebarCollapsed: collapsed }
        ),
      setSidebarWidth: (width) =>
        set((state) => {
          const sidebarWidth = clampSidebarWidth(width);
          return state.sidebarWidth === sidebarWidth ? state : { sidebarWidth };
        }),
    }),
    {
      name: 'system-layout',
      storage: createStoreJSONStorage('tab'),
      version: 4,
      migrate: migrateSystemLayoutState,
    }
  )
);

const resetSystemLayoutStore = (): void => {
  useSystemLayoutStore.setState(DEFAULT_SYSTEM_LAYOUT_STATE);
};

registerStore({
  id: 'layout.system-layout',
  scope: 'tab',
  reset: resetSystemLayoutStore,
});
