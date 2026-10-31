import { UserVerificationApi } from '@domain-apis';

import { UserVerificationServicesMap } from '../mapper/UserVerificationServices.map';
import type { IUserVerificationService } from './index.type';

export const createUserVerificationServices = (): IUserVerificationService => ({
  sendEmailVerify: (params) => UserVerificationApi.initiateEmailVerify(params),
  confirmEmailVerify: (params) => UserVerificationApi.checkEmailVerify(params),
  initiateUISVerify: (params) => UserVerificationApi.initiateFudanUISVerify(params),
  checkFudanUISVerify: async () =>
    UserVerificationServicesMap.mapFudanUISVerifyStatusFromApi(
      await UserVerificationApi.checkFudanUISVerify()
    ),
});
