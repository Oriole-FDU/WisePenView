import { buildDriveNodeScope, type DriveNodeScope } from '@/domains/Drive';
import { registerStore } from '@/store/lifecycle';
import { createStoreJSONStorage } from '@/store/persistence';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarDriveScopeState {
  scope: DriveNodeScope;
  setScope: (scope: DriveNodeScope) => void;
}

const DEFAULT_SIDEBAR_DRIVE_SCOPE_STATE = {
  scope: buildDriveNodeScope(),
};

export const useSidebarDriveScopeStore = create<SidebarDriveScopeState>()(
  persist(
    (set) => ({
      ...DEFAULT_SIDEBAR_DRIVE_SCOPE_STATE,
      setScope: (scope) => set({ scope }),
    }),
    {
      name: 'sidebar-drive-scope',
      storage: createStoreJSONStorage('session'),
      version: 1,
      migrate: () => DEFAULT_SIDEBAR_DRIVE_SCOPE_STATE,
    }
  )
);

const resetSidebarDriveScopeStore = (): void => {
  useSidebarDriveScopeStore.setState(DEFAULT_SIDEBAR_DRIVE_SCOPE_STATE);
};

registerStore({
  id: 'sidebar.drive-scope',
  scope: 'session',
  reset: resetSidebarDriveScopeStore,
});
