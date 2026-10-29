import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiRequestSchema } from '@/apis/schema';

import {
  GetUserInfoApiResponseSchema,
  ListUserSearchSuggestionsApiRequestSchema,
  SearchUsersApiRequestSchema,
  UserSearchApiResponseSchema,
} from './UserInformationApi.schema';

export const GetUserInfoApiContract = defineApiContract({
  name: 'GetUserInfoApi',
  method: 'GET',
  endpoint: '/user/getUserInfo',
  requestPlacement: 'none',
  transport: 'json',
  request: EmptyApiRequestSchema,
  response: GetUserInfoApiResponseSchema,
});

export const SearchUsersApiContract = defineApiContract({
  name: 'SearchUsersApi',
  method: 'GET',
  endpoint: '/user/searchUser',
  requestPlacement: 'query',
  transport: 'json',
  request: SearchUsersApiRequestSchema,
  response: UserSearchApiResponseSchema,
});

export const ListUserSearchSuggestionsApiContract = defineApiContract({
  name: 'ListUserSearchSuggestionsApi',
  method: 'GET',
  endpoint: '/user/listUserSearchSuggestions',
  requestPlacement: 'query',
  transport: 'json',
  request: ListUserSearchSuggestionsApiRequestSchema,
  response: UserSearchApiResponseSchema,
});

export type GetUserInfoApiRequest = ApiContractRequest<typeof GetUserInfoApiContract>;
export type GetUserInfoApiResponse = ApiContractResponse<typeof GetUserInfoApiContract>;
export type SearchUsersApiRequest = ApiContractRequest<typeof SearchUsersApiContract>;
export type SearchUsersApiResponse = ApiContractResponse<typeof SearchUsersApiContract>;
export type ListUserSearchSuggestionsApiRequest = ApiContractRequest<
  typeof ListUserSearchSuggestionsApiContract
>;
export type ListUserSearchSuggestionsApiResponse = ApiContractResponse<
  typeof ListUserSearchSuggestionsApiContract
>;
