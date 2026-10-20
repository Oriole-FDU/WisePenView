import type { Nullable } from '@/apis/api.type';

export type UserTaskCodeApiValue =
  'DAILY_CHECK_IN' | 'STUDENT_VERIFICATION' | 'TEACHER_VERIFICATION' | 'INVITE_VERIFIED_USER';
export type UserTaskTypeApiValue = 'ONCE' | 'PERIODIC' | 'UNCHECKED';
export type RewardTypeApiValue = 'TOKEN' | 'COIN' | 'NONE';

export interface UserTaskRewardPreviewApiResponse {
  rewardType: RewardTypeApiValue;
  rewardAmount: Nullable<number>;
  minRewardAmount: Nullable<number>;
  maxRewardAmount: Nullable<number>;
  rewardStepAmount: Nullable<number>;
}

export interface UserTaskOnceStatusApiResponse {
  completed: boolean;
  completeTime: Nullable<number>;
}

export interface UserTaskPeriodicStatusApiResponse {
  completedTimes: number;
  maxTimes: number;
  windowStart: Nullable<number>;
  windowEnd: Nullable<number>;
  lastCompleteTime: Nullable<number>;
}

export interface UserTaskStatusApiResponse {
  taskCode: UserTaskCodeApiValue;
  taskType: UserTaskTypeApiValue;
  enabled: boolean;
  canComplete: boolean;
  rewardPreview: Nullable<UserTaskRewardPreviewApiResponse>;
  once: Nullable<UserTaskOnceStatusApiResponse>;
  periodic: Nullable<UserTaskPeriodicStatusApiResponse>;
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
