export type TourCode =
  | 'SYSTEM_FEATURES_TOUR'
  | 'COURSE_FEATURES_TOUR'
  | 'AI_CHAT_FEATURES_TOUR'
  | 'NOTE_FEATURES_TOUR'
  | 'DRIVE_FEATURES_TOUR';

export interface UserTourStatus {
  tourCode: TourCode;
  completed: boolean;
}
