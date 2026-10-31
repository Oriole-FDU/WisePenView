import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';

import {
  ListUserInviteRecordsApiRequestSchema,
  ListUserInviteRecordsApiResponseSchema,
} from './UserInviteApi.schema';

export const ListUserInviteRecordsApiContract = defineApiContract({
  name: 'ListUserInviteRecordsApi',
  method: 'GET',
  endpoint: '/user/invite/listRecords',
  requestPlacement: 'query',
  transport: 'json',
  request: ListUserInviteRecordsApiRequestSchema,
  response: ListUserInviteRecordsApiResponseSchema,
});

export type ListUserInviteRecordsApiContractRequest = ApiContractRequest<
  typeof ListUserInviteRecordsApiContract
>;
export type ListUserInviteRecordsApiContractResponse = ApiContractResponse<
  typeof ListUserInviteRecordsApiContract
>;
