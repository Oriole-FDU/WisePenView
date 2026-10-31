import { UserVerificationApi } from '@domain-apis';

import { UserVerificationServicesMap } from '../mapper/UserVerificationServices.map';
import type { IUserVerificationService } from './index.type';

export const createUserVerificationServices = (): IUserVerificationService => ({
  sendEmailVerify: (params) =>
    UserVerificationApi.initiateEmailVerify(
      UserVerificationServicesMap.mapSendEmailVerifyRequest(params)
    ),
  confirmEmailVerify: (params) =>
    UserVerificationApi.checkEmailVerify(
      UserVerificationServicesMap.mapConfirmEmailVerifyRequest(params)
    ),
  initiateUISVerify: (params) =>
    UserVerificationApi.initiateFudanUISVerify(
      UserVerificationServicesMap.mapInitiateUISVerifyRequest(params)
    ),
  checkFudanUISVerify: async () =>
    UserVerificationServicesMap.mapFudanUISVerifyStatusFromApi(
      await UserVerificationApi.checkFudanUISVerify()
    ),
});
