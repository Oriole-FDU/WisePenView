import { executeApiContract } from '@/apis/executeApiContract';

import {
  DailyCheckInApiContract,
  type DailyCheckInApiContractResponse,
  ListUserTaskStatusApiContract,
  type ListUserTaskStatusApiContractResponse,
} from './UserTaskApi.contract';

function listTaskStatus(): Promise<ListUserTaskStatusApiContractResponse> {
  return executeApiContract(ListUserTaskStatusApiContract, undefined);
}

function dailyCheckIn(): Promise<DailyCheckInApiContractResponse> {
  return executeApiContract(DailyCheckInApiContract, undefined);
}

export const UserTaskApi = {
  listTaskStatus,
  dailyCheckIn,
};
