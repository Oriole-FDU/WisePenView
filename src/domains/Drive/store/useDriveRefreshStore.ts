import { create } from 'zustand';

import { registerStore } from '@/store/lifecycle';

interface DriveRefreshState {
  refreshVersion: number;
  requestRefresh: () => void;
}

const DEFAULT_DRIVE_REFRESH_STATE = {
  refreshVersion: 0,
};

export const useDriveRefreshStore = create<DriveRefreshState>()((set) => ({
  ...DEFAULT_DRIVE_REFRESH_STATE,
  requestRefresh: () => set((state) => ({ refreshVersion: state.refreshVersion + 1 })),
}));

const resetDriveRefreshStore = (): void => {
  useDriveRefreshStore.setState(DEFAULT_DRIVE_REFRESH_STATE);
};

registerStore({
  id: 'drive.refresh',
  scope: 'tab',
  reset: resetDriveRefreshStore,
});
