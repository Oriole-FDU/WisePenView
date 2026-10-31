import type { CheckFudanUISVerifyApiResponse } from '../apis/UserVerificationApi.schema';
import type { FudanUISVerifyStatusData } from '../service/index.type';

const mapFudanUISVerifyStatusFromApi = (
  data: CheckFudanUISVerifyApiResponse
): FudanUISVerifyStatusData => ({
  completed: data.completed,
  requireAction: data.requireAction,
  actionPayload: data.actionPayload ?? '',
  message: data.message ?? '',
});

export const UserVerificationServicesMap = {
  mapFudanUISVerifyStatusFromApi,
};
