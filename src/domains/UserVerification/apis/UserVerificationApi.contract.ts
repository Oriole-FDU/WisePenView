import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiRequestSchema, EmptyApiResponseSchema } from '@/apis/schema';

import {
  CheckEmailVerifyApiRequestSchema,
  CheckFudanUISVerifyApiResponseSchema,
  InitiateEmailVerifyApiRequestSchema,
  InitiateFudanUISVerifyApiRequestSchema,
} from './UserVerificationApi.schema';

export const InitiateEmailVerifyApiContract = defineApiContract({
  name: 'InitiateEmailVerifyApi',
  method: 'POST',
  endpoint: '/user/verify/initiateEmailVerify',
  requestPlacement: 'query',
  transport: 'json',
  request: InitiateEmailVerifyApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const InitiateFudanUISVerifyApiContract = defineApiContract({
  name: 'InitiateFudanUISVerifyApi',
  method: 'POST',
  endpoint: '/user/verify/initiateFudanUISVerify',
  requestPlacement: 'query',
  transport: 'json',
  request: InitiateFudanUISVerifyApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const CheckFudanUISVerifyApiContract = defineApiContract({
  name: 'CheckFudanUISVerifyApi',
  method: 'GET',
  endpoint: '/user/verify/checkFudanUISVerify',
  requestPlacement: 'none',
  transport: 'json',
  request: EmptyApiRequestSchema,
  response: CheckFudanUISVerifyApiResponseSchema,
});

export const CheckEmailVerifyApiContract = defineApiContract({
  name: 'CheckEmailVerifyApi',
  method: 'GET',
  endpoint: '/user/verify/checkEmailVerify',
  requestPlacement: 'query',
  transport: 'json',
  request: CheckEmailVerifyApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export type InitiateEmailVerifyApiContractRequest = ApiContractRequest<
  typeof InitiateEmailVerifyApiContract
>;
export type InitiateFudanUISVerifyApiContractRequest = ApiContractRequest<
  typeof InitiateFudanUISVerifyApiContract
>;
export type CheckFudanUISVerifyApiContractResponse = ApiContractResponse<
  typeof CheckFudanUISVerifyApiContract
>;
export type CheckEmailVerifyApiContractRequest = ApiContractRequest<
  typeof CheckEmailVerifyApiContract
>;
