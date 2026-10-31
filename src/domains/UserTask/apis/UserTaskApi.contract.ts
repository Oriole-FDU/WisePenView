import { type ApiContractResponse, defineApiContract } from '@/apis/contract';
import { EmptyApiRequestSchema } from '@/apis/schema';

import {
  ListUserTaskStatusApiResponseSchema,
  UserTaskCheckInApiSchema,
} from './UserTaskApi.schema';

export const ListUserTaskStatusApiContract = defineApiContract({
  name: 'ListUserTaskStatusApi',
  method: 'GET',
  endpoint: '/user/task/listTaskStatus',
  requestPlacement: 'none',
  transport: 'json',
  request: EmptyApiRequestSchema,
  response: ListUserTaskStatusApiResponseSchema,
});

export const DailyCheckInApiContract = defineApiContract({
  name: 'DailyCheckInApi',
  method: 'POST',
  endpoint: '/user/task/dailyCheckIn',
  requestPlacement: 'none',
  transport: 'json',
  request: EmptyApiRequestSchema,
  response: UserTaskCheckInApiSchema,
});

export type ListUserTaskStatusApiContractResponse = ApiContractResponse<
  typeof ListUserTaskStatusApiContract
>;
export type DailyCheckInApiContractResponse = ApiContractResponse<typeof DailyCheckInApiContract>;
