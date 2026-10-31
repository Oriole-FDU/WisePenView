import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiResponseSchema } from '@/apis/schema';

import {
  ListUserMessagesApiRequestSchema,
  ListUserMessagesApiResponseSchema,
  ReadMessageApiRequestSchema,
} from './MessageApi.schema';

export const ListUserMessagesApiContract = defineApiContract({
  name: 'ListUserMessagesApi',
  method: 'GET',
  endpoint: '/user/message/listMessages',
  requestPlacement: 'query',
  transport: 'json',
  request: ListUserMessagesApiRequestSchema,
  response: ListUserMessagesApiResponseSchema,
});

export const ReadMessageApiContract = defineApiContract({
  name: 'ReadMessageApi',
  method: 'POST',
  endpoint: '/user/message/readMessage',
  requestPlacement: 'body',
  transport: 'json',
  request: ReadMessageApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export type ListUserMessagesApiContractRequest = ApiContractRequest<
  typeof ListUserMessagesApiContract
>;
export type ListUserMessagesApiContractResponse = ApiContractResponse<
  typeof ListUserMessagesApiContract
>;
export type ReadMessageApiContractRequest = ApiContractRequest<typeof ReadMessageApiContract>;
