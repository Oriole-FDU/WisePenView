import type {
  UserTaskCheckInApiResponse,
  UserTaskPeriodicStatusApiResponse,
  UserTaskRewardPreviewApiResponse,
  UserTaskStatusApiResponse,
} from '../apis/UserTaskApi.schema';
import type {
  UserTaskCheckInResult,
  UserTaskPeriodicStatus,
  UserTaskRewardPreview,
  UserTaskStatus,
} from '../entity/userTask';

const mapTaskRewardPreviewFromApi = (
  data: UserTaskRewardPreviewApiResponse | null
): UserTaskRewardPreview | undefined => {
  if (!data) return undefined;
  return {
    rewardType: data.rewardType,
    rewardAmount: data.rewardAmount ?? undefined,
    minRewardAmount: data.minRewardAmount ?? undefined,
    maxRewardAmount: data.maxRewardAmount ?? undefined,
    rewardStepAmount: data.rewardStepAmount ?? undefined,
  };
};

const mapTaskPeriodicStatusFromApi = (
  data: UserTaskPeriodicStatusApiResponse | null
): UserTaskPeriodicStatus | undefined => {
  if (!data) return undefined;
  return {
    completedTimes: data.completedTimes,
    maxTimes: data.maxTimes,
    windowStart: data.windowStart ?? undefined,
    windowEnd: data.windowEnd ?? undefined,
    lastCompleteTime: data.lastCompleteTime ?? undefined,
  };
};

const mapTaskStatusFromApi = (data: UserTaskStatusApiResponse): UserTaskStatus => ({
  taskCode: data.taskCode,
  taskType: data.taskType,
  enabled: data.enabled,
  canComplete: data.canComplete,
  rewardPreview: mapTaskRewardPreviewFromApi(data.rewardPreview),
  once: data.once
    ? {
        completed: data.once.completed,
        completeTime: data.once.completeTime ?? undefined,
      }
    : undefined,
  periodic: mapTaskPeriodicStatusFromApi(data.periodic),
});

const mapTaskStatusesFromApi = (data: UserTaskStatusApiResponse[]): UserTaskStatus[] =>
  data.map(mapTaskStatusFromApi);

const mapTaskCheckInFromApi = (data: UserTaskCheckInApiResponse): UserTaskCheckInResult => ({
  rewardType: data.rewardType,
  rewardAmount: data.rewardAmount,
  hitGuarantee: data.hitGuarantee,
  cycleProgress: data.cycleProgress,
  cycleCount: data.cycleCount,
  checkedInToday: data.checkedInToday,
});

export const UserTaskServicesMap = {
  mapTaskStatusesFromApi,
  mapTaskCheckInFromApi,
};
