import { type ApiContractRequest, defineApiContract } from '@/apis/contract';
import { EmptyApiResponseSchema } from '@/apis/schema';

import {
  ChangeUserInfoApiRequestSchema,
  ChangeUserProfileApiRequestSchema,
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

export type ChangeUserInfoApiContractRequest = ApiContractRequest<typeof ChangeUserInfoApiContract>;
export type ChangeUserProfileApiContractRequest = ApiContractRequest<
  typeof ChangeUserProfileApiContract
>;
