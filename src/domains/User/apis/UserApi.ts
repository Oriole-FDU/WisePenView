import type { AxiosRequestConfig } from 'axios';

import { executeApiContract } from '@/apis/executeApiContract';
import { apiGetUnchecked, apiPostUnchecked, apiPutUnchecked } from '@/apis/request';

import type {
  AddFeedbackApiRequest,
  ChangeUserInfoApiRequest,
  ChangeUserProfileApiRequest,
  CheckEmailVerifyApiRequest,
  CheckFudanUISVerifyApiResponse,
  InitiateEmailVerifyApiRequest,
  InitiateFudanUISVerifyApiRequest,
  ListUserInviteRecordsApiRequest,
  ListUserInviteRecordsApiResponse,
} from './UserApi.type';
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

function initiateEmailVerify(req: InitiateEmailVerifyApiRequest): Promise<void> {
  return apiPostUnchecked('/user/verify/initiateEmailVerify', null, { params: req });
}

function initiateFudanUISVerify(req: InitiateFudanUISVerifyApiRequest): Promise<void> {
  return apiPostUnchecked('/user/verify/initiateFudanUISVerify', null, { params: req });
}

function checkFudanUISVerify(): Promise<CheckFudanUISVerifyApiResponse> {
  return apiGetUnchecked('/user/verify/checkFudanUISVerify');
}

function checkEmailVerify(req: CheckEmailVerifyApiRequest): Promise<void> {
  return apiGetUnchecked('/user/verify/checkEmailVerify', { params: req });
}

function changeUserInfo(req: ChangeUserInfoApiRequest): Promise<void> {
  return apiPutUnchecked('/user/changeUserInfo', req);
}

function changeUserProfile(req: ChangeUserProfileApiRequest): Promise<void> {
  return apiPutUnchecked('/user/changeUserProfile', req);
}

function addFeedback(req: AddFeedbackApiRequest): Promise<void> {
  return apiPostUnchecked('/system/feedback/addFeedback', req);
}

function listInviteRecords(
  req: ListUserInviteRecordsApiRequest
): Promise<ListUserInviteRecordsApiResponse> {
  return apiGetUnchecked('/user/invite/listRecords', { params: req });
}

export const UserApi = {
  getUserInfo,
  searchUser,
  listUserSearchSuggestions,
  initiateEmailVerify,
  initiateFudanUISVerify,
  checkFudanUISVerify,
  checkEmailVerify,
  changeUserInfo,
  changeUserProfile,
  addFeedback,
  listInviteRecords,
};
