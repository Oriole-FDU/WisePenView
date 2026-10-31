import { create } from 'zustand';

import { GUIDE_TOUR_CODE, GUIDE_TOUR_ID, type GuideTourId } from '@/constants/tour';
import type { UserTourStatus } from '@/domains/UserTour';
import { registerStore } from '@/store/lifecycle';

type GuideTourPendingMap = Record<GuideTourId, boolean>;

interface GuideTaskState {
  loaded: boolean;
  loading: boolean;
  pendingByTourId: GuideTourPendingMap;
  beginLoading: () => boolean;
  loadTourStatuses: (statuses: UserTourStatus[]) => void;
  finishLoading: () => void;
  markCompleted: (tourId: GuideTourId) => void;
}

const DEFAULT_PENDING_BY_TOUR_ID: GuideTourPendingMap = {
  [GUIDE_TOUR_ID.sidebar]: false,
  [GUIDE_TOUR_ID.chat]: false,
  [GUIDE_TOUR_ID.note]: false,
  [GUIDE_TOUR_ID.drive]: false,
  [GUIDE_TOUR_ID.courseResources]: false,
};

const DEFAULT_GUIDE_TASK_STATE = {
  loaded: false,
  loading: false,
  pendingByTourId: DEFAULT_PENDING_BY_TOUR_ID,
};

function mapPendingByTourId(statuses: UserTourStatus[]): GuideTourPendingMap {
  const statusByCode = new Map(statuses.map((status) => [status.tourCode, status]));
  const pendingByTourId = { ...DEFAULT_PENDING_BY_TOUR_ID };

  (Object.keys(GUIDE_TOUR_CODE) as GuideTourId[]).forEach((tourId) => {
    const status = statusByCode.get(GUIDE_TOUR_CODE[tourId]);
    pendingByTourId[tourId] = status?.completed === false;
  });
  return pendingByTourId;
}

export const useGuideTaskStore = create<GuideTaskState>()((set, get) => ({
  ...DEFAULT_GUIDE_TASK_STATE,

  beginLoading: () => {
    const state = get();
    if (state.loaded || state.loading) return false;
    set({ loading: true });
    return true;
  },

  loadTourStatuses: (statuses) =>
    set({
      loaded: true,
      loading: false,
      pendingByTourId: mapPendingByTourId(statuses),
    }),

  finishLoading: () =>
    set({
      loaded: true,
      loading: false,
      pendingByTourId: { ...DEFAULT_PENDING_BY_TOUR_ID },
    }),

  markCompleted: (tourId) =>
    set((state) =>
      state.pendingByTourId[tourId]
        ? {
            pendingByTourId: {
              ...state.pendingByTourId,
              [tourId]: false,
            },
          }
        : state
    ),
}));

const resetGuideTaskStore = (): void => {
  useGuideTaskStore.setState(DEFAULT_GUIDE_TASK_STATE);
};

registerStore({
  id: 'guide.tour-status',
  scope: 'session',
  reset: resetGuideTaskStore,
});
