import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiRequestSchema, EmptyApiResponseSchema } from '@/apis/schema';

import {
  CompleteTourApiRequestSchema,
  ListUserTourStatusApiResponseSchema,
} from './UserTourApi.schema';

export const ListUserTourStatusApiContract = defineApiContract({
  name: 'ListUserTourStatusApi',
  method: 'GET',
  endpoint: '/user/tour/listTourStatus',
  requestPlacement: 'none',
  transport: 'json',
  request: EmptyApiRequestSchema,
  response: ListUserTourStatusApiResponseSchema,
});

export const CompleteTourApiContract = defineApiContract({
  name: 'CompleteTourApi',
  method: 'POST',
  endpoint: '/user/tour/completeTour',
  requestPlacement: 'query',
  transport: 'json',
  request: CompleteTourApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export type ListUserTourStatusApiContractResponse = ApiContractResponse<
  typeof ListUserTourStatusApiContract
>;
export type CompleteTourApiContractRequest = ApiContractRequest<typeof CompleteTourApiContract>;
