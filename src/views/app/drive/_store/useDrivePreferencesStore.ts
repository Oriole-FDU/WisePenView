import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { registerStore } from '@/store/lifecycle';
import { createStoreJSONStorage } from '@/store/persistence';

export type DriveViewMode = 'uploadQueue' | 'tableDrive' | 'favorites';

const DEFAULT_DRIVE_PREFERENCES = {
  viewMode: 'tableDrive' as DriveViewMode,
};

type DrivePreferencesState = {
  viewMode: DriveViewMode;
  setViewMode: (v: DriveViewMode) => void;
};

export const useDrivePreferencesStore = create<DrivePreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_DRIVE_PREFERENCES,
      setViewMode: (v) => set({ viewMode: v }),
    }),
    { name: 'drive-preferences', storage: createStoreJSONStorage('tab') }
  )
);

const resetDrivePreferencesStore = (): void => {
  useDrivePreferencesStore.setState(DEFAULT_DRIVE_PREFERENCES);
};

registerStore({
  id: 'drive-view.preferences',
  scope: 'tab',
  reset: resetDrivePreferencesStore,
});
