import { UserTourApi } from '@domain-apis';

import { UserTourServicesMap } from '../mapper/UserTourServices.map';
import type { IUserTourService } from './index.type';

export const createUserTourServices = (): IUserTourService => ({
  listTourStatus: async () =>
    UserTourServicesMap.mapTourStatusesFromApi(await UserTourApi.listTourStatus()),
  completeTour: (tourCode) => UserTourApi.completeTour(tourCode),
});
