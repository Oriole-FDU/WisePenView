import type { AxiosRequestConfig } from 'axios';

import { executeApiContract } from '@/apis/executeApiContract';

import {
  ChangeUserInfoApiContract,
  type ChangeUserInfoApiContractRequest,
  ChangeUserProfileApiContract,
  type ChangeUserProfileApiContractRequest,
  ListUserInviteRecordsApiContract,
  type ListUserInviteRecordsApiContractRequest,
  type ListUserInviteRecordsApiContractResponse,
} from './AccountApi.contract';
import {
  GetUserInfoApiContract,
  type GetUserInfoApiResponse,
  ListUserSearchSuggestionsApiContract,
  type ListUserSearchSuggestionsApiRequest,
  type ListUserSearchSuggestionsApiResponse,
  SearchUsersApiContract,
  type SearchUsersApiRequest,
  type SearchUsersApiResponse,
} from './UserInformationApi.contract';

/** User API: /user/* */

async function getUserInfo(config?: AxiosRequestConfig): Promise<GetUserInfoApiResponse> {
  return executeApiContract(GetUserInfoApiContract, undefined, config);
}

async function searchUser(req: SearchUsersApiRequest): Promise<SearchUsersApiResponse> {
  return executeApiContract(SearchUsersApiContract, req);
}

async function listUserSearchSuggestions(
  req: ListUserSearchSuggestionsApiRequest
): Promise<ListUserSearchSuggestionsApiResponse> {
  return executeApiContract(ListUserSearchSuggestionsApiContract, req);
}

async function changeUserInfo(req: ChangeUserInfoApiContractRequest): Promise<void> {
  await executeApiContract(ChangeUserInfoApiContract, req);
}

async function changeUserProfile(req: ChangeUserProfileApiContractRequest): Promise<void> {
  await executeApiContract(ChangeUserProfileApiContract, req);
}

function listInviteRecords(
  req: ListUserInviteRecordsApiContractRequest
): Promise<ListUserInviteRecordsApiContractResponse> {
  return executeApiContract(ListUserInviteRecordsApiContract, req);
}

export const UserApi = {
  getUserInfo,
  searchUser,
  listUserSearchSuggestions,
  changeUserInfo,
  changeUserProfile,
  listInviteRecords,
};
