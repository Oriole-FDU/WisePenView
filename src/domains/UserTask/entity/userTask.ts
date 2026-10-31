export type UserTaskCode =
  'DAILY_CHECK_IN' | 'STUDENT_VERIFICATION' | 'TEACHER_VERIFICATION' | 'INVITE_VERIFIED_USER';
export type UserTaskType = 'ONCE' | 'PERIODIC' | 'UNCHECKED';
export type UserTaskRewardType = 'TOKEN' | 'COIN' | 'NONE';

export interface UserTaskRewardPreview {
  rewardType: UserTaskRewardType;
  rewardAmount?: number;
  minRewardAmount?: number;
  maxRewardAmount?: number;
  rewardStepAmount?: number;
}

export interface UserTaskOnceStatus {
  completed: boolean;
  completeTime?: number;
}

export interface UserTaskPeriodicStatus {
  completedTimes: number;
  maxTimes: number;
  windowStart?: number;
  windowEnd?: number;
  lastCompleteTime?: number;
}

export interface UserTaskStatus {
  taskCode: UserTaskCode;
  taskType: UserTaskType;
  enabled: boolean;
  canComplete: boolean;
  rewardPreview?: UserTaskRewardPreview;
  once?: UserTaskOnceStatus;
  periodic?: UserTaskPeriodicStatus;
}

export interface UserTaskCheckInResult {
  rewardType: UserTaskRewardType;
  rewardAmount: number;
  hitGuarantee: boolean;
  cycleProgress: number;
  cycleCount: number;
  checkedInToday: boolean;
}
