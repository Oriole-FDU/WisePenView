import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiResponseSchema } from '@/apis/schema';

import {
  ChangeUserInfoApiRequestSchema,
  ChangeUserProfileApiRequestSchema,
  ListUserInviteRecordsApiRequestSchema,
  ListUserInviteRecordsApiResponseSchema,
} from './AccountApi.schema';

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

export const ListUserInviteRecordsApiContract = defineApiContract({
  name: 'ListUserInviteRecordsApi',
  method: 'GET',
  endpoint: '/user/invite/listRecords',
  requestPlacement: 'query',
  transport: 'json',
  request: ListUserInviteRecordsApiRequestSchema,
  response: ListUserInviteRecordsApiResponseSchema,
});

export type ChangeUserInfoApiContractRequest = ApiContractRequest<typeof ChangeUserInfoApiContract>;
export type ChangeUserProfileApiContractRequest = ApiContractRequest<
  typeof ChangeUserProfileApiContract
>;
export type ListUserInviteRecordsApiContractRequest = ApiContractRequest<
  typeof ListUserInviteRecordsApiContract
>;
export type ListUserInviteRecordsApiContractResponse = ApiContractResponse<
  typeof ListUserInviteRecordsApiContract
>;
