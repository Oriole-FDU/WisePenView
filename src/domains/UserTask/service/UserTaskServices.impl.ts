import { UserTaskApi } from '@domain-apis';

import { UserTaskServicesMap } from '../mapper/UserTaskServices.map';
import type { IUserTaskService } from './index.type';

export const createUserTaskServices = (): IUserTaskService => ({
  listTaskStatus: async () =>
    UserTaskServicesMap.mapTaskStatusesFromApi(await UserTaskApi.listTaskStatus()),
  dailyCheckIn: async () =>
    UserTaskServicesMap.mapTaskCheckInFromApi(await UserTaskApi.dailyCheckIn()),
});
