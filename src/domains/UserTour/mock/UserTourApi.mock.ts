import { mockResponse } from '@/domains/_shared/mock/response';

import type { UserTourApi as UserTourApiContract } from '../apis/UserTourApi';
import type { TourCodeApiValue } from '../apis/UserTourApi.schema';

const TOUR_CODES = [
  'SYSTEM_FEATURES_TOUR',
  'COURSE_FEATURES_TOUR',
  'AI_CHAT_FEATURES_TOUR',
  'NOTE_FEATURES_TOUR',
  'DRIVE_FEATURES_TOUR',
] as const satisfies readonly TourCodeApiValue[];

const completedTourCodes = new Set<TourCodeApiValue>();

export const UserTourApi: typeof UserTourApiContract = {
  listTourStatus: () =>
    mockResponse(
      TOUR_CODES.map((tourCode) => ({
        tourCode,
        completed: completedTourCodes.has(tourCode),
      }))
    ),
  completeTour: async (tourCode) => {
    completedTourCodes.add(tourCode);
  },
};
