import { apiGetUnchecked, apiPostUnchecked } from '@/apis/request';

import type { UserTaskCheckInApiResponse, UserTaskStatusApiResponse } from './UserTaskApi.type';

function listTaskStatus(): Promise<UserTaskStatusApiResponse[]> {
  return apiGetUnchecked('/user/task/listTaskStatus');
}

function dailyCheckIn(): Promise<UserTaskCheckInApiResponse> {
  return apiPostUnchecked('/user/task/dailyCheckIn', null);
}

export const UserTaskApi = {
  listTaskStatus,
  dailyCheckIn,
};
