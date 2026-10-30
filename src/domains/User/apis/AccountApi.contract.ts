import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiRequestSchema, EmptyApiResponseSchema } from '@/apis/schema';

import {
  AddFeedbackApiRequestSchema,
  ChangeUserInfoApiRequestSchema,
  ChangeUserProfileApiRequestSchema,
  CheckEmailVerifyApiRequestSchema,
  CheckFudanUISVerifyApiResponseSchema,
  InitiateEmailVerifyApiRequestSchema,
  InitiateFudanUISVerifyApiRequestSchema,
  ListUserInviteRecordsApiRequestSchema,
  ListUserInviteRecordsApiResponseSchema,
} from './AccountApi.schema';

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

export const ChangeUserInfoApiContract = defineApiContract({
  name: 'ChangeUserInfoApi',
  method: 'PUT',
  endpoint: '/user/changeUserInfo',
  requestPlacement: 'body',
  transport: 'json',
  request: ChangeUserInfoApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const ChangeUserProfileApiContract = defineApiContract({
  name: 'ChangeUserProfileApi',
  method: 'PUT',
  endpoint: '/user/changeUserProfile',
  requestPlacement: 'body',
  transport: 'json',
  request: ChangeUserProfileApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const AddFeedbackApiContract = defineApiContract({
  name: 'AddFeedbackApi',
  method: 'POST',
  endpoint: '/system/feedback/addFeedback',
  requestPlacement: 'body',
  transport: 'json',
  request: AddFeedbackApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const ListUserInviteRecordsApiContract = defineApiContract({
  name: 'ListUserInviteRecordsApi',
  method: 'GET',
  endpoint: '/user/invite/listRecords',
  requestPlacement: 'query',
  transport: 'json',
  request: ListUserInviteRecordsApiRequestSchema,
  response: ListUserInviteRecordsApiResponseSchema,
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
export type ChangeUserInfoApiContractRequest = ApiContractRequest<typeof ChangeUserInfoApiContract>;
export type ChangeUserProfileApiContractRequest = ApiContractRequest<
  typeof ChangeUserProfileApiContract
>;
export type AddFeedbackApiContractRequest = ApiContractRequest<typeof AddFeedbackApiContract>;
export type ListUserInviteRecordsApiContractRequest = ApiContractRequest<
  typeof ListUserInviteRecordsApiContract
>;
export type ListUserInviteRecordsApiContractResponse = ApiContractResponse<
  typeof ListUserInviteRecordsApiContract
>;
