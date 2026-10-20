export type UserTaskCodeApiValue =
  'DAILY_CHECK_IN' | 'STUDENT_VERIFICATION' | 'TEACHER_VERIFICATION' | 'INVITE_VERIFIED_USER';
export type UserTaskTypeApiValue = 'ONCE' | 'PERIODIC' | 'UNCHECKED';
export type RewardTypeApiValue = 'TOKEN' | 'COIN' | 'NONE';

export interface UserTaskRewardPreviewApiResponse {
  rewardType: RewardTypeApiValue;
  rewardAmount: number | null;
  minRewardAmount: number | null;
  maxRewardAmount: number | null;
  rewardStepAmount: number | null;
}

export interface UserTaskOnceStatusApiResponse {
  completed: boolean;
  completeTime: number | null;
}

export interface UserTaskPeriodicStatusApiResponse {
  completedTimes: number;
  maxTimes: number;
  windowStart: number | null;
  windowEnd: number | null;
  lastCompleteTime: number | null;
}

export interface UserTaskStatusApiResponse {
  taskCode: UserTaskCodeApiValue;
  taskType: UserTaskTypeApiValue;
  enabled: boolean;
  canComplete: boolean;
  rewardPreview: UserTaskRewardPreviewApiResponse | null;
  once: UserTaskOnceStatusApiResponse | null;
  periodic: UserTaskPeriodicStatusApiResponse | null;
}

export interface UserTaskCheckInApiResponse {
  rewardType: RewardTypeApiValue;
  rewardAmount: number;
  hitGuarantee: boolean;
  cycleProgress: number;
  cycleCount: number;
  checkedInToday: boolean;
}

export type UserTaskCode = UserTaskCodeApiValue;
export type UserTaskType = UserTaskTypeApiValue;
