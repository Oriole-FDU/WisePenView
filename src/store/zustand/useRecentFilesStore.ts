import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecentFileItem {
  resourceId: string;
  resourceName: string;
  resourceType?: string;
}

const MAX_RECENT = 15;

type RecentFilesState = {
  items: RecentFileItem[];
  addFile: (item: RecentFileItem) => void;
  removeFile: (resourceId: string) => void;
  updateFileName: (resourceId: string, resourceName: string) => void;
};

export const useRecentFilesStore = create<RecentFilesState>()(
  persist(
    (set) => ({
      items: [],

      addFile: (item) =>
        set((state) => {
          const filtered = state.items.filter((i) => i.resourceId !== item.resourceId);
          const next = [item, ...filtered].slice(0, MAX_RECENT);
          return { items: next };
        }),

      removeFile: (resourceId) =>
        set((state) => ({
          items: state.items.filter((i) => i.resourceId !== resourceId),
        })),

      updateFileName: (resourceId, resourceName) =>
        set((state) => ({
          items: state.items.map((i) => (i.resourceId === resourceId ? { ...i, resourceName } : i)),
        })),
    }),
    { name: 'recent-files' }
  )
);
