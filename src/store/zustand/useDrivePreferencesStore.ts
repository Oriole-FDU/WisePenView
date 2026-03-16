import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DriveViewMode = 'folder' | 'flat';

type DrivePreferencesState = {
  viewMode: DriveViewMode;
  filterCollapsed: boolean;
  setViewMode: (v: DriveViewMode) => void;
  setFilterCollapsed: (v: boolean) => void;
};

export const useDrivePreferencesStore = create<DrivePreferencesState>()(
  persist(
    (set) => ({
      viewMode: 'folder',
      filterCollapsed: true,
      setViewMode: (v) => set({ viewMode: v }),
      setFilterCollapsed: (v) => set({ filterCollapsed: v }),
    }),
    { name: 'drive-preferences' }
  )
);
