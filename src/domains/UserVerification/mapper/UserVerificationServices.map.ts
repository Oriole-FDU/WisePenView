import type {
  CheckEmailVerifyApiRequest,
  CheckFudanUISVerifyApiResponse,
  InitiateEmailVerifyApiRequest,
  InitiateFudanUISVerifyApiRequest,
} from '../apis/UserVerificationApi.schema';
import type {
  ConfirmEmailVerifyRequest,
  FudanUISVerifyStatusData,
  InitiateUISVerifyRequest,
  SendEmailVerifyRequest,
} from '../service/index.type';

const mapSendEmailVerifyRequest = (
  params: SendEmailVerifyRequest
): InitiateEmailVerifyApiRequest => ({
  email: params.email,
});

const mapInitiateUISVerifyRequest = (
  params: InitiateUISVerifyRequest
): InitiateFudanUISVerifyApiRequest => ({
  uisAccount: params.uisAccount,
  uisPassword: params.uisPassword,
});

const mapFudanUISVerifyStatusFromApi = (
  data: CheckFudanUISVerifyApiResponse
): FudanUISVerifyStatusData => ({
  completed: data.completed,
  requireAction: data.requireAction,
  actionPayload: data.actionPayload ?? '',
  message: data.message ?? '',
});

const mapConfirmEmailVerifyRequest = (
  params: ConfirmEmailVerifyRequest
): CheckEmailVerifyApiRequest => ({
  token: params.token,
});

export const UserVerificationServicesMap = {
  mapSendEmailVerifyRequest,
  mapInitiateUISVerifyRequest,
  mapFudanUISVerifyStatusFromApi,
  mapConfirmEmailVerifyRequest,
};
