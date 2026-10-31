import { UserInviteApi } from '@domain-apis';

import { UserInviteServicesMap } from '../mapper/UserInviteServices.map';
import type { IUserInviteService } from './index.type';

export const createUserInviteServices = (): IUserInviteService => ({
  listInviteRecords: async (params) =>
    UserInviteServicesMap.mapListInviteRecordsFromApi(
      await UserInviteApi.listInviteRecords(
        UserInviteServicesMap.mapListInviteRecordsRequest(params)
      )
    ),
});
