import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { registerStore } from '@/store/lifecycle';
import { createStoreJSONStorage } from '@/store/persistence';

export interface PdfPreviewProgress {
  page: number;
  zoom: string;
}

const DEFAULT_PDF_PREVIEW_PROGRESS = {
  progressByResourceId: {} as Record<string, PdfPreviewProgress>,
};

type PdfPreviewProgressState = {
  progressByResourceId: Record<string, PdfPreviewProgress>;
  setProgress: (resourceId: string, progress: PdfPreviewProgress) => void;
};

export const usePdfPreviewProgressStore = create<PdfPreviewProgressState>()(
  persist(
    (set) => ({
      ...DEFAULT_PDF_PREVIEW_PROGRESS,

      setProgress: (resourceId, progress) =>
        set((state) => {
          const prev = state.progressByResourceId[resourceId];
          if (prev != null && prev.page === progress.page && prev.zoom === progress.zoom) {
            return state;
          }
          return {
            progressByResourceId: {
              ...state.progressByResourceId,
              [resourceId]: progress,
            },
          };
        }),
    }),
    {
      name: 'pdf-preview-progress',
      storage: createStoreJSONStorage('tab'),
      version: 1,
      migrate: () => DEFAULT_PDF_PREVIEW_PROGRESS,
    }
  )
);

export const removePdfPreviewProgress = (resourceId: string): void => {
  usePdfPreviewProgressStore.setState((state) => {
    if (state.progressByResourceId[resourceId] == null) {
      return state;
    }
    const progressByResourceId = { ...state.progressByResourceId };
    delete progressByResourceId[resourceId];
    return { progressByResourceId };
  });
};

const resetPdfPreviewProgressStore = (): void => {
  usePdfPreviewProgressStore.setState(DEFAULT_PDF_PREVIEW_PROGRESS);
};

registerStore({
  id: 'pdf-viewer.preview-progress',
  scope: 'tab',
  reset: resetPdfPreviewProgressStore,
});
