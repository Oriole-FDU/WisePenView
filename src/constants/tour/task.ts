import type { TourCode } from '@/domains/UserTour';

import type { GuideTourId } from './types';

/** 前端引导范围与后端引导完成记录的一一映射。 */
export const GUIDE_TOUR_CODE = {
  sidebar: 'SYSTEM_FEATURES_TOUR',
  chat: 'AI_CHAT_FEATURES_TOUR',
  note: 'NOTE_FEATURES_TOUR',
  drive: 'DRIVE_FEATURES_TOUR',
  courseResources: 'COURSE_FEATURES_TOUR',
} as const satisfies Record<GuideTourId, TourCode>;
